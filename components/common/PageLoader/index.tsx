import { Center, Loader } from "@mantine/core";

import classes from "./PageLoader.module.css";

export function PageLoader() {
  return (
    <Center className={classes.root} role="status" aria-label="불러오는 중">
      <Loader size="sm" />
    </Center>
  );
}
