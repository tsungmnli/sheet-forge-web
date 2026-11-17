import { Stack, Text } from "@mantine/core";

import classes from "./PlaceholderPage.module.css";

export function PlaceholderPage({
  title,
  description = "이 화면은 아직 준비 중이에요.",
}: {
  title: string;
  description?: string;
}) {
  return (
    <Stack className={classes.root} align="center" justify="center" gap={4}>
      <Text size="lg" fw={600} c="dimmed">
        {title}
      </Text>
      <Text size="sm" c="dimmed">
        {description}
      </Text>
    </Stack>
  );
}
