// components/ApiDashboardV3.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { ApiDashboardV3 } from "./ApiDashboardV3";

const meta: Meta<typeof ApiDashboardV3> = {
  title: "Components/ApiDashboardV3",
  component: ApiDashboardV3,
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    apiUrl: {
      control: "text",
      description: "URL of your API dashboard endpoint",
    },
    title: {
      control: "text",
      description: "Dashboard heading",
    },
    pageSize: {
      control: { type: "number", min: 1, max: 20 },
      description: "Number of endpoints per page",
    },
  },
};

export default meta;
type Story = StoryObj<typeof ApiDashboardV3>;

export const Default: Story = {
  args: {
    apiUrl: "https://your-api.example.com/dashboard",
    title: "API Overview",
    pageSize: 7,
  },
};
