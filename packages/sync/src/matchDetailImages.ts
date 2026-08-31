import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { downloadFile, isFolder, listChildren, type DriveFile } from "./drive";

const DETAIL_FOLDER_NAME = "상세페이지";
const PHOTO_FOLDER_NAME = "사진";

// 동영상 등 이미지가 아닌 파일이 썸네일/상세이미지로 잘못 들어가는 것을 방지한다.
const files = (list: DriveFile[]) =>
  list.filter((f) => !isFolder(f) && f.mimeType.startsWith("image/"));

// 폴더별 자식 목록 캐시. 같은 그룹 폴더(예: "무화과") 아래에 여러 상품(홍무화과/청무화과)이
// 걸려 있으면 한 번만 조회하도록 재사용한다.
const childrenCache = new Map<string, Promise<DriveFile[]>>();
function getFolderChildren(folderId: string): Promise<DriveFile[]> {
  let cached = childrenCache.get(folderId);
  if (!cached) {
    cached = listChildren(folderId);
    childrenCache.set(folderId, cached);
  }
  return cached;
}

async function getRootCategories(rootFolderId: string): Promise<DriveFile[]> {
  return getFolderChildren(rootFolderId);
}

async function resolveCategoryFolder(
  rootFolderId: string,
  categoryHint?: string
): Promise<DriveFile | undefined> {
  const categories = (await getRootCategories(rootFolderId)).filter(isFolder);
  if (categoryHint) {
    const exact = categories.find((f) => f.name === categoryHint);
    if (exact) return exact;
    const partial = categories.find(
      (f) => categoryHint.includes(f.name) || f.name.includes(categoryHint)
    );
    if (partial) return partial;
  }
  return undefined;
}

function pickBestMatch(folders: DriveFile[], productName: string): DriveFile | undefined {
  const exact = folders.find((f) => f.name === productName);
  if (exact) return exact;

  const candidates = folders
    .filter((f) => productName.includes(f.name) || f.name.includes(productName))
    .sort((a, b) => b.name.length - a.name.length);
  return candidates[0];
}

async function isLeafVarietyFolder(folderId: string): Promise<boolean> {
  const children = await getFolderChildren(folderId);
  return children.some(
    (f) => isFolder(f) && (f.name === PHOTO_FOLDER_NAME || f.name === DETAIL_FOLDER_NAME)
  );
}

/**
 * 품종 폴더를 찾는다. 대부분은 카테고리 폴더 바로 아래에 있지만("자색양파" 등), 일부는
 * "무화과" 같은 그룹 폴더 아래에 실제 품종 폴더("홍무화과", "청무화과")가 한 단계 더
 * 들어가 있는 구조라 그 경우도 확인한다.
 */
async function findVarietyFolder(
  categoryFolderId: string,
  productName: string
): Promise<DriveFile | undefined> {
  const topLevel = (await getFolderChildren(categoryFolderId)).filter(isFolder);

  const exact = topLevel.find((f) => f.name === productName);
  if (exact) return exact;

  const partialCandidates = topLevel
    .filter((f) => productName.includes(f.name) || f.name.includes(productName))
    .sort((a, b) => b.name.length - a.name.length);

  // 부분일치 후보 중 실제로 사진/상세페이지를 가진 "리프" 폴더만 채택한다.
  // (그렇지 않으면 "홍무화과"가 그룹 폴더 "무화과"로 잘못 매칭되는 문제가 생김)
  for (const candidate of partialCandidates) {
    if (await isLeafVarietyFolder(candidate.id)) return candidate;
  }

  // 그룹 폴더 하위에서 정확히 일치하는 품종 폴더를 찾는다.
  for (const group of topLevel) {
    const subFolders = (await getFolderChildren(group.id)).filter(isFolder);
    const nestedExact = subFolders.find((f) => f.name === productName);
    if (nestedExact) return nestedExact;
  }

  // 그룹 폴더 하위 부분일치까지 확인한다.
  for (const group of topLevel) {
    const subFolders = (await getFolderChildren(group.id)).filter(isFolder);
    const nestedPartial = pickBestMatch(subFolders, productName);
    if (nestedPartial) return nestedPartial;
  }

  // 마지막 수단: 리프 여부를 확인하지 못했더라도 최상위 부분일치 후보를 반환.
  return partialCandidates[0];
}

async function findSubfolder(parentId: string, name: string): Promise<DriveFile | undefined> {
  const children = await getFolderChildren(parentId);
  return children.find((f) => isFolder(f) && f.name === name);
}

/**
 * 썸네일용 사진을 찾는다. 최우선은 "사진" 폴더. 없거나 비어 있으면 "상세페이지"를 제외한
 * 다른 하위 폴더(사이즈비교, 배송컷 등)를 순서대로 확인하고, 그래도 없으면 품종 폴더에
 * 바로 들어있는 파일을 사용한다.
 */
async function findThumbnailCandidates(varietyFolderId: string): Promise<DriveFile[]> {
  const children = await getFolderChildren(varietyFolderId);

  const photoFolder = children.find((f) => isFolder(f) && f.name === PHOTO_FOLDER_NAME);
  if (photoFolder) {
    const photoFiles = files(await getFolderChildren(photoFolder.id));
    if (photoFiles.length > 0) return photoFiles;
  }

  const otherFolders = children.filter(
    (f) => isFolder(f) && f.name !== PHOTO_FOLDER_NAME && f.name !== DETAIL_FOLDER_NAME
  );
  for (const folder of otherFolders) {
    const candidateFiles = files(await getFolderChildren(folder.id));
    if (candidateFiles.length > 0) return candidateFiles;
  }

  const looseFiles = files(children);
  if (looseFiles.length > 0) return looseFiles;

  return [];
}

export interface DriveMatchResult {
  matched: boolean;
  categoryFolder?: string;
  varietyFolder?: string;
  detailImages: DriveFile[];
  thumbnailImages: DriveFile[];
}

export async function findProductDriveImages(
  rootFolderId: string,
  productName: string,
  categoryHint?: string
): Promise<DriveMatchResult> {
  const categories = categoryHint
    ? [await resolveCategoryFolder(rootFolderId, categoryHint)].filter(Boolean)
    : [];
  const searchSpace = categories.length
    ? (categories as DriveFile[])
    : (await getRootCategories(rootFolderId)).filter(isFolder);

  for (const categoryFolder of searchSpace) {
    const varietyFolder = await findVarietyFolder(categoryFolder.id, productName);
    if (!varietyFolder) continue;

    const detailFolder = await findSubfolder(varietyFolder.id, DETAIL_FOLDER_NAME);
    const [detailImages, thumbnailImages] = await Promise.all([
      detailFolder ? getFolderChildren(detailFolder.id).then(files) : [],
      findThumbnailCandidates(varietyFolder.id),
    ]);

    if (detailImages.length === 0 && thumbnailImages.length === 0) continue;

    return {
      matched: true,
      categoryFolder: categoryFolder.name,
      varietyFolder: varietyFolder.name,
      detailImages,
      thumbnailImages,
    };
  }

  return { matched: false, detailImages: [], thumbnailImages: [] };
}

export async function downloadImagesToDir(
  filesToSave: DriveFile[],
  outDir: string,
  prefix: string
): Promise<string[]> {
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const savedPaths: string[] = [];
  for (let i = 0; i < filesToSave.length; i++) {
    const file = filesToSave[i];
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${prefix}-${i + 1}.${ext}`;
    const buffer = await downloadFile(file.id);
    writeFileSync(join(outDir, filename), buffer);
    savedPaths.push(filename);
  }
  return savedPaths;
}
