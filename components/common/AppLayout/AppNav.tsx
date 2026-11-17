"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, Group } from "@mantine/core";
import {
  IconHelpCircle,
  IconHome,
  IconSettings,
} from "@tabler/icons-react";

import classes from "./AppLayout.module.css";

const NAV_ITEMS = [
  { label: "홈", href: "/", icon: IconHome },
  { label: "설정", href: "/settings", icon: IconSettings },
  { label: "도움말", href: "/help", icon: IconHelpCircle },
];

// pathname이 null이면 어느 메뉴도 선택 표시를 하지 않는다. (Suspense 대기 중에 보여 줄 모습)
function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <Group gap={4} wrap="nowrap" component="nav" aria-label="주 메뉴">
      {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
        const active =
          pathname !== null && (href === "/" ? pathname === "/" : pathname.startsWith(href));
        return (
          <Button
            key={href}
            component={Link}
            href={href}
            size="sm"
            variant={active ? "light" : "subtle"}
            color={active ? "blue" : "gray"}
            leftSection={<Icon size={18} stroke={1.8} />}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            classNames={{ section: classes.navSection }}
          >
            <span className={classes.navLabel}>{label}</span>
          </Button>
        );
      })}
    </Group>
  );
}

function ActiveNavLinks() {
  return <NavLinks pathname={usePathname()} />;
}

export { ActiveNavLinks, NavLinks };
