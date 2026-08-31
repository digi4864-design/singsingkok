declare global {
  interface Window {
    daum?: {
      Postcode: new (options: { oncomplete: (data: DaumPostcodeRawResult) => void }) => {
        open: () => void;
      };
    };
  }
}

interface DaumPostcodeRawResult {
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
  userSelectedType: "R" | "J";
}

export interface DaumPostcodeResult {
  zonecode: string;
  address: string;
}

let loadingPromise: Promise<void> | null = null;

function loadDaumPostcodeScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.daum?.Postcode) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("우편번호 서비스를 불러오지 못했습니다."));
    document.head.appendChild(script);
  });
  return loadingPromise;
}

export async function openDaumPostcode(onComplete: (result: DaumPostcodeResult) => void) {
  await loadDaumPostcodeScript();
  if (!window.daum) return;
  new window.daum.Postcode({
    oncomplete: (data) => {
      const address = data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress;
      onComplete({ zonecode: data.zonecode, address });
    },
  }).open();
}
