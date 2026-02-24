// components/ApiDashboard.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { ApiDashboard } from "./ApiDashboard";

const meta: Meta<typeof ApiDashboard> = {
  title: "Components/ApiDashboard",
  component: ApiDashboard,
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
  },
};

export default meta;
type Story = StoryObj<typeof ApiDashboard>;

export const Default: Story = {
  args: {
    apiUrl: "https://your-api.example.com/dashboard",
    title: "API Overview",
  },
};
