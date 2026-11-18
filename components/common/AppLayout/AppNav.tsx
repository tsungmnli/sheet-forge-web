"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button, Group, Menu } from "@mantine/core";
import {
  IconHelpCircle,
  IconHome,
  IconLogout,
  IconSettings,
  IconUserCircle,
} from "@tabler/icons-react";

import { friendlyError } from "@/lib/api";
import { getMe, logout } from "@/lib/auth";
import { notify } from "@/lib/notify";
import classes from "./AppLayout.module.css";

const NAV_ITEMS = [
  { label: "홈", href: "/", icon: IconHome },
  { label: "설정", href: "/settings", icon: IconSettings },
  { label: "도움말", href: "/help", icon: IconHelpCircle },
];

// pathname이 null이면 어느 메뉴도 선택 표시를 하지 않는다. (Suspense 대기 중에 보여 줄 모습)
function NavLinks({ pathname }: { pathname: string | null }) {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getMe();
      if (cancelled) return;
      if (res.data) setUserName(res.data.display_name);
    })();
    return () => { cancelled = true; };
  }, []);

  const onLogout = async () => {
    setLoggingOut(true);
    const res = await logout();
    setLoggingOut(false);
    if (res.error) {
      notify.error(friendlyError(res.error));
      return;
    }
    router.replace("/login");
  };

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
            color={active ? "brand" : "gray"}
            leftSection={<Icon size={18} stroke={1.8} />}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            classNames={{ section: classes.navSection }}
          >
            <span className={classes.navLabel}>{label}</span>
          </Button>
        );
      })}
      {userName && (
        <Menu shadow="sm" width={220} position="bottom-end">
          <Menu.Target>
            <Button
              variant="subtle"
              color="gray"
              size="sm"
              leftSection={<IconUserCircle size={18} stroke={1.8} />}
              aria-label="내 계정"
              classNames={{ section: classes.navSection }}
            >
              <span className={classes.navLabel}>{userName}</span>
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>{userName}</Menu.Label>
            <Menu.Item
              color="red"
              leftSection={<IconLogout size={16} />}
              onClick={onLogout}
              disabled={loggingOut}
            >
              {loggingOut ? "로그아웃 중…" : "로그아웃"}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  );
}

function ActiveNavLinks() {
  return <NavLinks pathname={usePathname()} />;
}

export { ActiveNavLinks, NavLinks };
