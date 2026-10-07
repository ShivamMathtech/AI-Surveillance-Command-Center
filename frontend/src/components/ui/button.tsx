import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
const variants = cva("button", {
  variants: {
    variant: {
      default: "",
      primary: "primary",
      danger: "danger",
      ghost: "ghost",
    },
  },
  defaultVariants: { variant: "default" },
});
export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof variants>
>(({ className, variant, ...props }, ref) => (
  <button
    ref={ref}
    className={twMerge(clsx(variants({ variant }), className))}
    {...props}
  />
));
Button.displayName = "Button";
