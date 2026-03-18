/**
 * 오케스트레이터 실행 시 trace 이벤트 검증 유틸
 */

export interface TraceEvent {
  type: string;
  subtype?: string;
}

export interface VerifyResult {
  passed: boolean;
  checks: {
    taskStarted: boolean;
    taskProgress: boolean;
    taskNotification: boolean;
    agentToolCall: boolean;
    finalSuccess: boolean;
  };
  errors: string[];
}

export interface VerifyOptions {
  /** Agent 도구 호출 감지 여부 (orchestrator에서 assistant content 블록 확인 후 전달) */
  agentToolCall?: boolean;
}

/**
 * 메시지 스트림에서 task_* 이벤트 및 최종 결과 검증
 */
export function verifyTraceEvents(
  events: TraceEvent[],
  options: VerifyOptions = {}
): VerifyResult {
  const errors: string[] = [];
  const checks = {
    taskStarted: false,
    taskProgress: false,
    taskNotification: false,
    agentToolCall: options.agentToolCall ?? false,
    finalSuccess: false,
  };

  for (const event of events) {
    if (event.type === "system" && event.subtype === "task_started") {
      checks.taskStarted = true;
    }
    if (event.type === "system" && event.subtype === "task_progress") {
      checks.taskProgress = true;
    }
    if (event.type === "system" && event.subtype === "task_notification") {
      checks.taskNotification = true;
    }
    if (event.type === "result" && event.subtype === "success") {
      checks.finalSuccess = true;
    }
  }

  if (!checks.taskStarted) errors.push("task_started 이벤트 미수신");
  if (!checks.taskProgress) errors.push("task_progress 이벤트 미수신 (최소 1회)");
  if (!checks.taskNotification)
    errors.push("task_notification 이벤트 미수신 (status: completed)");
  if (!checks.agentToolCall) errors.push("Agent 도구 호출 미감지");
  if (!checks.finalSuccess) errors.push("최종 result (subtype: success) 미수신");

  return {
    passed: errors.length === 0,
    checks,
    errors,
  };
}

/**
 * 검증 결과를 콘솔에 출력
 */
export function printVerifyResult(result: VerifyResult): void {
  console.log("\n=== 검증 결과 ===");
  console.log("task_started:", result.checks.taskStarted ? "✓" : "✗");
  console.log("task_progress:", result.checks.taskProgress ? "✓" : "✗");
  console.log("task_notification:", result.checks.taskNotification ? "✓" : "✗");
  console.log("Agent 도구 호출:", result.checks.agentToolCall ? "✓" : "✗");
  console.log("최종 success:", result.checks.finalSuccess ? "✓" : "✗");
  if (result.errors.length > 0) {
    console.log("\n실패 항목:");
    result.errors.forEach((e) => console.log("  -", e));
  }
  console.log("\n결과:", result.passed ? "PASS" : "FAIL");
}
