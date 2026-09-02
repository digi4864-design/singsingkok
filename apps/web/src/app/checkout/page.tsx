import { prisma } from "@farm-mall/db";
import { auth } from "@/lib/auth";
import { getTierDiscountPercent, getNextTier } from "@/lib/membership";
import { CheckoutClient } from "./CheckoutClient";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const session = await auth();
  const [setting, user, savedAddresses] = await Promise.all([
    prisma.storeSetting.findUnique({ where: { id: "default" } }),
    session?.user
      ? prisma.user.findUnique({
          where: { id: session.user.id },
          select: {
            name: true,
            phone: true,
            zipCode: true,
            address: true,
            addressDetail: true,
            membershipTier: true,
            hasWelcomeCoupon: true,
            welcomeCouponUsed: true,
            hasFirstPurchaseCoupon: true,
            firstPurchaseCouponUsed: true,
            points: true,
            totalSpent: true,
          },
        })
      : Promise.resolve(null),
    session?.user
      ? prisma.address.findMany({
          where: { userId: session.user.id },
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        })
      : Promise.resolve([]),
  ]);

  const tierDiscountPercent = user ? getTierDiscountPercent(user.membershipTier) : 0;
  const couponEligible = Boolean(user?.hasWelcomeCoupon && !user?.welcomeCouponUsed);
  const firstPurchaseCouponEligible = Boolean(
    user?.hasFirstPurchaseCoupon && !user?.firstPurchaseCouponUsed
  );
  const nextTier = user ? getNextTier(user.totalSpent) : null;

  // 저장된 배송지가 있으면 기본 배송지를, 없으면(과거 방식) 회원정보에 저장된 단일 주소를 사용한다.
  const defaultFromBook = savedAddresses[0];
  const defaultAddress = defaultFromBook
    ? {
        recipientName: defaultFromBook.recipientName,
        recipientPhone: defaultFromBook.recipientPhone,
        zipCode: defaultFromBook.zipCode,
        address: defaultFromBook.address,
        addressDetail: defaultFromBook.addressDetail ?? "",
      }
    : user
      ? {
          recipientName: user.name ?? "",
          recipientPhone: user.phone ?? "",
          zipCode: user.zipCode ?? "",
          address: user.address ?? "",
          addressDetail: user.addressDetail ?? "",
        }
      : null;

  return (
    <CheckoutClient
      bankInfo={
        setting
          ? {
              bankName: setting.bankName,
              bankAccountNumber: setting.bankAccountNumber,
              bankAccountHolder: setting.bankAccountHolder,
            }
          : null
      }
      defaultAddress={defaultAddress}
      savedAddresses={savedAddresses.map((a) => ({
        id: a.id,
        label: a.label,
        recipientName: a.recipientName,
        recipientPhone: a.recipientPhone,
        zipCode: a.zipCode,
        address: a.address,
        addressDetail: a.addressDetail ?? "",
        isDefault: a.isDefault,
      }))}
      userId={session?.user?.id ?? null}
      customerEmail={session?.user?.email ?? null}
      tierDiscountPercent={tierDiscountPercent}
      couponEligible={couponEligible}
      firstPurchaseCouponEligible={firstPurchaseCouponEligible}
      availablePoints={user?.points ?? 0}
      nextTier={
        nextTier
          ? { label: nextTier.info.label, emoji: nextTier.info.emoji, discountPercent: nextTier.info.discountPercent, remaining: nextTier.remaining }
          : null
      }
    />
  );
}
