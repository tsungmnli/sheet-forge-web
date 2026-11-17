"use client";

import { Fragment } from "react";
import { Group, Text } from "@mantine/core";
import { IconCheck, IconLock } from "@tabler/icons-react";

import classes from "./Exam.module.css";

const STEPS = [
  "사진 올리고\n문제 고르기",
  "문제\n확인하기",
  "문제지\n만들기",
];

export function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <Group gap={0} align="stretch" wrap="nowrap">
      {STEPS.map((label, i) => {
        const state = i < currentStep ? "done" : i === currentStep ? "active" : "locked";
        return (
          <Fragment key={label}>
            <div className={classes.step} data-state={state}>
              <div className={classes.stepDot}>
                {state === "done" ? (
                  <IconCheck size={16} />
                ) : state === "locked" ? (
                  <IconLock size={14} />
                ) : (
                  i + 1
                )}
              </div>
              <Text
                size="sm"
                fw={state === "locked" ? 500 : 700}
                c={state === "active" ? "blue.7" : state === "done" ? "green.7" : "dimmed"}
                className={classes.stepLabel}
              >
                {label}
              </Text>
            </div>
            {i < STEPS.length - 1 && <div className={classes.stepLine} />}
          </Fragment>
        );
      })}
    </Group>
  );
}
