import { prisma } from "@farm-mall/db";
import { auth } from "@/lib/auth";
import { getTierDiscountPercent } from "@/lib/membership";
import { CheckoutClient } from "./CheckoutClient";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const session = await auth();
  const [setting, user] = await Promise.all([
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
          },
        })
      : Promise.resolve(null),
  ]);

  const tierDiscountPercent = user ? getTierDiscountPercent(user.membershipTier) : 0;
  const couponEligible = Boolean(user?.hasWelcomeCoupon && !user?.welcomeCouponUsed);

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
      defaultAddress={
        user
          ? {
              recipientName: user.name ?? "",
              recipientPhone: user.phone ?? "",
              zipCode: user.zipCode ?? "",
              address: user.address ?? "",
              addressDetail: user.addressDetail ?? "",
            }
          : null
      }
      userId={session?.user?.id ?? null}
      customerEmail={session?.user?.email ?? null}
      tierDiscountPercent={tierDiscountPercent}
      couponEligible={couponEligible}
    />
  );
}
