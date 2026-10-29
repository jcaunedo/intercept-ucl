import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowLeftIcon } from "lucide-react";

import {
	Breadcrumb,
	BreadcrumbEllipsis,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "./breadcrumb";

const meta = {
	title: "Navigation/Breadcrumb",
	component: Breadcrumb,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof Breadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

function Trail({ size, collapsed = false }: { size: "xs" | "sm"; collapsed?: boolean }) {
	return (
		<Breadcrumb>
			<BreadcrumbList size={size}>
				<BreadcrumbItem>
					<BreadcrumbLink href='#'>
						<ArrowLeftIcon aria-hidden='true' />
						Census
					</BreadcrumbLink>
				</BreadcrumbItem>
				<BreadcrumbSeparator />
				{collapsed ? (
					<>
						<BreadcrumbItem>
							<BreadcrumbEllipsis />
						</BreadcrumbItem>
						<BreadcrumbSeparator />
					</>
				) : (
					<>
						<BreadcrumbItem>
							<BreadcrumbLink href='#'>CVMC</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbLink href='#'>MICU</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
					</>
				)}
				<BreadcrumbItem>
					<BreadcrumbLink href='#'>Bed 12</BreadcrumbLink>
				</BreadcrumbItem>
				<BreadcrumbSeparator />
				<BreadcrumbItem>
					<BreadcrumbPage>Carter, Ellen</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	);
}

/** xs (24px, 14px text): a back arrow on the first link, muted links, the current page in medium `foreground`. */
export const Default: Story = {
	render: () => <Trail size='xs' />,
};

/** sm (32px, 16px text), as in AppHeader's patient context. */
export const Small: Story = {
	render: () => <Trail size='sm' />,
};

/** A long trail collapsed to "•••" in the middle. */
export const Collapsed: Story = {
	render: () => <Trail size='xs' collapsed />,
};

/** Both sizes, full and collapsed. */
export const AllVariants: Story = {
	render: () => (
		<div className='flex flex-col items-start gap-4'>
			<Trail size='xs' />
			<Trail size='xs' collapsed />
			<Trail size='sm' />
			<Trail size='sm' collapsed />
		</div>
	),
};
