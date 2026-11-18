"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconCamera,
  IconChevronRight,
  IconFilePlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";

import { PageLoader } from "@/components/common/PageLoader";
import { ExamList } from "./ExamList";
import { WorksheetList } from "./WorksheetList";
import { useHome, type HomeTab } from "./hooks/useHome";
import classes from "./Home.module.css";

export function HomeClient() {
  const router = useRouter();
  const h = useHome();
  const { todo } = h;
  const todoCount = (todo?.needs_review ?? 0) + (todo?.recognizing ?? 0) + (todo?.failed ?? 0);

  return (
    <Stack gap="lg">
      {/* 큰 버튼 두 개 */}
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <input
          ref={h.fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={h.onPhotosChosen}
        />
        <Button
          className={classes.bigButton}
          classNames={{ inner: classes.bigButtonInner }}
          color="brand"
          radius="lg"
          disabled={h.creating || h.uploading}
          onClick={h.pickPhotos}
        >
          <IconCamera size={32} />
          <Text fw={600} size="lg" c="inherit">
            {h.uploading ? "사진을 올리는 중이에요…" : "시험지 사진 올리기"}
          </Text>
        </Button>
        <Button
          className={classes.bigButton}
          classNames={{ inner: classes.bigButtonInner }}
          color="teal"
          radius="lg"
          loading={h.creating}
          disabled={h.uploading}
          onClick={h.createWorksheet}
        >
          <IconFilePlus size={32} />
          <Text fw={600} size="lg" c="inherit">
            문제지 만들기
          </Text>
        </Button>
      </SimpleGrid>

      {/* 할 일 */}
      {todo && todoCount > 0 && (
        <Paper withBorder p="md">
          <Title order={5} mb="sm">
            할 일
          </Title>
          <Group gap="xs">
            {todo.needs_review > 0 && (
              <Button
                variant="light"
                color="orange"
                leftSection={<IconAlertCircle size={18} />}
                rightSection={<IconChevronRight size={16} />}
                onClick={() => {
                  if (todo.next_problem) {
                    router.push(
                      `/exams/${todo.next_problem.exam_id}/problems/${todo.next_problem.problem_id}`,
                    );
                  }
                }}
              >
                확인할 문제 {todo.needs_review}개
              </Button>
            )}
            {todo.recognizing > 0 && (
              <Badge size="xl" variant="light" color="brand" leftSection={<Loader size={14} />}>
                읽는 중 {todo.recognizing}개
              </Badge>
            )}
            {todo.failed > 0 && (
              <Badge
                size="xl"
                variant="light"
                color="red"
                leftSection={<IconAlertCircle size={16} />}
              >
                읽기 실패 {todo.failed}개
              </Badge>
            )}
          </Group>
        </Paper>
      )}

      {/* 탭 + 목록 */}
      <Paper withBorder className={classes.list}>
        <Tabs value={h.tab} onChange={(v) => h.setTab((v as HomeTab) ?? "exams")}>
          <Tabs.List grow>
            <Tabs.Tab value="exams">시험지</Tabs.Tab>
            <Tabs.Tab value="worksheets">문제지</Tabs.Tab>
          </Tabs.List>
        </Tabs>

        <Group p="sm" gap="xs" wrap="wrap">
          <Select
            aria-label="학생으로 거르기"
            placeholder="모든 학생"
            data={h.students}
            value={h.studentFilter}
            onChange={h.setStudentFilter}
            clearable
            w={160}
          />
          <TextInput
            aria-label="찾기"
            placeholder="제목·학생으로 찾기"
            leftSection={<IconSearch size={16} />}
            value={h.searchQuery}
            onChange={(e) => h.setSearchQuery(e.currentTarget.value)}
            style={{ flex: 1, minWidth: 160 }}
          />
        </Group>

        {h.loading ? (
          <PageLoader />
        ) : h.tab === "exams" ? (
          <ExamList
            exams={h.filteredExams}
            onDelete={h.deleteExam}
            onOpen={(id) => router.push(`/exams/${id}`)}
          />
        ) : (
          <WorksheetList
            worksheets={h.filteredWorksheets}
            onDelete={h.deleteWorksheet}
            onDuplicate={h.duplicateWorksheet}
            onOpen={(id) => router.push(`/worksheets/${id}`)}
          />
        )}
      </Paper>

      {/* 휴지통 링크 */}
      <Group justify="center">
        <Button
          component={Link}
          href="/trash"
          variant="subtle"
          color="gray"
          leftSection={<IconTrash size={16} />}
        >
          휴지통
        </Button>
      </Group>
    </Stack>
  );
}
