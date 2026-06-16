import { Box, Text } from "ink";
import { Badge, Spinner } from "@inkjs/ui";

export type SubStatus = "pending" | "running" | "done";

export function AgentTree({
  statuses,
}: {
  statuses: Record<string, SubStatus>;
}) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <Text bold color="cyan">
        서브에이전트
      </Text>
      {Object.entries(statuses).map(([name, status]) => (
        <Box key={name} gap={1}>
          {status === "running" ? (
            <Spinner />
          ) : (
            <Badge color={status === "done" ? "green" : "gray"}>
              {status === "done" ? "✓" : "·"}
            </Badge>
          )}
          <Text color={status === "running" ? "yellow" : status === "done" ? "green" : "gray"}>
            {name}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
