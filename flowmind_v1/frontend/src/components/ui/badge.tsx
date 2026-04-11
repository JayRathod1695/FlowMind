import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors duration-200 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-[#007AFF] text-[#000000] [a]:hover:bg-[#007AFF]/90",
        secondary:
          "bg-[#E5E5E5] text-[#000000] [a]:hover:bg-[#FFFFFF]",
        destructive:
          "bg-[#FEE2E2] text-[#991B1B] focus-visible:ring-[#DC2626]/25 [a]:hover:bg-[#FCA5A5]",
        outline:
          "border-[#AFAFAF] text-[#000000] [a]:hover:bg-[#E5E5E5] [a]:hover:text-[#000000]",
        ghost:
          "hover:bg-[#E5E5E5] hover:text-[#000000]",
        link: "text-[#007AFF] underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
