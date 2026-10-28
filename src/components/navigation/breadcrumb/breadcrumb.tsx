import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronRightIcon, EllipsisIcon } from "lucide-react";

import { cn } from "@/lib/utils";

// The list sets the text size and row height; items, links and separators inherit them.
const breadcrumbListVariants = cva("flex flex-wrap items-center gap-1.5 break-words text-muted-foreground", {
	variants: {
		size: {
			xs: "min-h-6 text-sm/5",
			sm: "min-h-8 text-base/6",
		},
	},
	defaultVariants: {
		size: "xs",
	},
});

type BreadcrumbProps = React.ComponentProps<"nav">;

/**
 * Where the current page sits, as a trail of links back up to it. Compose it from BreadcrumbList, BreadcrumbItem,
 * BreadcrumbLink, BreadcrumbPage and BreadcrumbSeparator (shadcn's parts).
 *
 * Figma: [intercept.ds › Breadcrumb](https://www.figma.com/design/dl8m89yfeRZ5uMXnEvdgpY/intercept.ds?node-id=1169-563)
 */
function Breadcrumb({ "aria-label": ariaLabel = "Breadcrumb", ...props }: BreadcrumbProps) {
	return <nav data-slot='breadcrumb' aria-label={ariaLabel} {...props} />;
}

type BreadcrumbListProps = React.ComponentProps<"ol"> & VariantProps<typeof breadcrumbListVariants>;

function BreadcrumbList({ className, size = "xs", ...props }: BreadcrumbListProps) {
	return (
		<ol
			data-slot='breadcrumb-list'
			data-size={size}
			className={cn(breadcrumbListVariants({ size }), className)}
			{...props}
		/>
	);
}

type BreadcrumbItemProps = React.ComponentProps<"li">;

function BreadcrumbItem({ className, ...props }: BreadcrumbItemProps) {
	return <li data-slot='breadcrumb-item' className={cn("inline-flex items-center gap-1.5", className)} {...props} />;
}

type BreadcrumbLinkProps = React.ComponentProps<"a"> & {
	/** Renders the link styles on the child, e.g. a router link or a `<button>`. */
	asChild?: boolean;
};

/** A page above the current one. An icon goes first in the children (14px), e.g. a back arrow on the first link. */
function BreadcrumbLink({ asChild = false, className, ...props }: BreadcrumbLinkProps) {
	const Component = asChild ? Slot : "a";

	return (
		<Component
			data-slot='breadcrumb-link'
			className={cn(
				"inline-flex items-center gap-1.5 rounded-sm transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&>svg]:size-3.5 [&>svg]:shrink-0",
				className,
			)}
			{...props}
		/>
	);
}

type BreadcrumbPageProps = React.ComponentProps<"span">;

/** The current page: the trail's last item, not a link. */
function BreadcrumbPage({ className, ...props }: BreadcrumbPageProps) {
	return (
		<span
			data-slot='breadcrumb-page'
			role='link'
			aria-disabled='true'
			aria-current='page'
			className={cn("font-medium text-foreground", className)}
			{...props}
		/>
	);
}

type BreadcrumbSeparatorProps = React.ComponentProps<"li">;

/** A chevron between items. Pass children to replace it. */
function BreadcrumbSeparator({ children, className, ...props }: BreadcrumbSeparatorProps) {
	return (
		<li
			data-slot='breadcrumb-separator'
			role='presentation'
			aria-hidden='true'
			className={cn("text-icon-muted [&>svg]:size-3.5", className)}
			{...props}
		>
			{children ?? <ChevronRightIcon />}
		</li>
	);
}

type BreadcrumbEllipsisProps = React.ComponentProps<"span">;

/** Stands in for the pages collapsed out of a long trail. */
function BreadcrumbEllipsis({ className, ...props }: BreadcrumbEllipsisProps) {
	return (
		<span
			data-slot='breadcrumb-ellipsis'
			role='presentation'
			aria-hidden='true'
			className={cn("flex items-center text-icon-muted", className)}
			{...props}
		>
			<EllipsisIcon className='size-4' />
			<span className='sr-only'>More</span>
		</span>
	);
}

export {
	Breadcrumb,
	BreadcrumbEllipsis,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
	breadcrumbListVariants,
	type BreadcrumbEllipsisProps,
	type BreadcrumbItemProps,
	type BreadcrumbLinkProps,
	type BreadcrumbListProps,
	type BreadcrumbPageProps,
	type BreadcrumbProps,
};
