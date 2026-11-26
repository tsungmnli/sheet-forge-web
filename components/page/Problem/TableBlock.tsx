'use client';

import { ActionIcon, Button, Group, Menu, Stack, Text } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';

import { InlineView } from '@/components/common/ProblemInline';
import { stemTableCellPath } from '@/lib/stemPath';
import type { MathResultOut, TableBlockOut } from '@/lib/types';

import classes from './Problem.module.css';
import type { useProblemEditing } from './hooks/useProblemEditing';
import type { useProblemView } from './hooks/useProblemView';

type View = ReturnType<typeof useProblemView>;
type Editing = ReturnType<typeof useProblemEditing>;

const MAX_TABLE_ROWS = 40;
const MAX_TABLE_COLS = 8;

interface Props {
  bi: number;
  block: TableBlockOut;
  hintPaths: Set<string>;
  mathResults: Record<string, MathResultOut>;
  view: View;
  editing: Editing;
}

// 표 블록: 격자로 보여 주고 칸을 눌러 조각을 고친다. 행·열 추가/삭제.
export function TableBlock({ bi, block, hintPaths, mathResults, view, editing }: Props) {
  const { editingInline, setEditingInline, showMathEditor, setShowMathEditor, focusedPath } = view;
  const {
    addTableRow,
    deleteTableRow,
    addTableColumn,
    deleteTableColumn,
    editTableCellInline,
    addTableCellInline,
    deleteTableCellInline,
  } = editing;

  const cols = block.rows[0]?.length ?? 0;

  return (
    <Stack gap="xs">
      <div className={classes.tableScroll}>
        <table className={classes.stemTable}>
          <thead>
            <tr>
              {Array.from({ length: cols }, (_, c) => (
                <th key={c} className={classes.colActionCell}>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="xs"
                    aria-label="열 삭제"
                    disabled={cols <= 1}
                    onClick={() => deleteTableColumn(bi, c)}
                  >
                    <IconTrash size={12} />
                  </ActionIcon>
                </th>
              ))}
              <th className={classes.rowActionCell} />
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c} className={classes.stemCell}>
                    <div className={classes.cellContent}>
                      {cell.length === 0 && (
                        <Text span size="xs" c="dimmed">
                          (빈 칸)
                        </Text>
                      )}
                      {cell.map((il, ii) => {
                        const path = stemTableCellPath(bi, r, c, ii);
                        return (
                          <InlineView
                            key={ii}
                            inline={il}
                            path={path}
                            isFocused={focusedPath === path}
                            mathResult={mathResults[path]}
                            isHint={hintPaths.has(path)}
                            isEditing={editingInline === path}
                            isMathEditing={showMathEditor === path}
                            onEdit={() => setEditingInline(path)}
                            onEditMath={() => {
                              setShowMathEditor(path);
                              setEditingInline(null);
                            }}
                            onSaveText={(v) => {
                              editTableCellInline(bi, r, c, ii, {
                                t: 'text',
                                v,
                              });
                              setEditingInline(null);
                            }}
                            onSaveMath={(latex) => {
                              editTableCellInline(bi, r, c, ii, {
                                t: 'math',
                                latex,
                              });
                              setShowMathEditor(null);
                            }}
                            onCancel={() => {
                              setEditingInline(null);
                              setShowMathEditor(null);
                            }}
                            onDelete={() => deleteTableCellInline(bi, r, c, ii)}
                            onToggleHwpFix={
                              il.t === 'math'
                                ? () =>
                                    editTableCellInline(bi, r, c, ii, {
                                      ...il,
                                      hwp_fix: il.hwp_fix ? undefined : true,
                                    })
                                : undefined
                            }
                          />
                        );
                      })}
                      <Menu position="bottom-start" withinPortal>
                        <Menu.Target>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="xs"
                            aria-label="칸에 추가"
                          >
                            <IconPlus size={12} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            onClick={() =>
                              addTableCellInline(bi, r, c, {
                                t: 'text',
                                v: '',
                              })
                            }
                          >
                            글 추가
                          </Menu.Item>
                          <Menu.Item
                            onClick={() =>
                              addTableCellInline(bi, r, c, {
                                t: 'math',
                                latex: '',
                              })
                            }
                          >
                            수식 추가
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </div>
                  </td>
                ))}
                <td className={classes.rowActionCell}>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="xs"
                    aria-label="행 삭제"
                    disabled={block.rows.length <= 1}
                    onClick={() => deleteTableRow(bi, r)}
                  >
                    <IconTrash size={12} />
                  </ActionIcon>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Group gap={4}>
        <Button
          size="compact-sm"
          variant="light"
          color="gray"
          leftSection={<IconPlus size={14} />}
          disabled={block.rows.length >= MAX_TABLE_ROWS}
          onClick={() => addTableRow(bi)}
        >
          행 추가
        </Button>
        {block.rows.length >= MAX_TABLE_ROWS && (
          <Text size="xs" c="dimmed">
            최대 {MAX_TABLE_ROWS}행
          </Text>
        )}
        <Button
          size="compact-sm"
          variant="light"
          color="gray"
          leftSection={<IconPlus size={14} />}
          disabled={cols >= MAX_TABLE_COLS}
          onClick={() => addTableColumn(bi)}
        >
          열 추가
        </Button>
        {cols >= MAX_TABLE_COLS && (
          <Text size="xs" c="dimmed">
            최대 {MAX_TABLE_COLS}열
          </Text>
        )}
      </Group>
    </Stack>
  );
}
