import React from "react"
import { Button, UnstyledButton } from "@mantine/core"
import { useSelector } from "react-redux"
import { selectAuth } from "app/core/auth"
import AuthMenu from "app/core/auth/AuthMenu"
import { cn } from "app/core"
import { goHome, openConnect } from "./actions"


const AppHeader = () => {
  const { account } = useSelector(() => selectAuth()) || {}

  return (
    <header
      className={cn(
        "app-header",
        "flex shrink-0 items-center justify-between gap-3 border-b border-cs-border bg-cs-bg/88 px-3 py-2",
        "pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-[1rem]"
      )}
    >
      <UnstyledButton
        className={cn(
          "app-header-logo",
          "font-sans text-[0.875rem] font-semibold leading-normal tracking-[0.02em] text-cs-accent"
        )}
        onClick={goHome}
      >
        casino<span className={cn("app-header-logo-mark", "text-cs-muted")}>·syndicate</span>
      </UnstyledButton>
      <div className={cn("app-header-actions", "flex shrink-0 items-center gap-3")}>
        {account && <AuthMenu />}
        {!account &&
          <Button
            className={cn("app-header-connect")}
            variant="subtle"
            color="gray"
            onClick={openConnect}
          >
            Connect
          </Button>
        }
      </div>
    </header>
  )
}

export default AppHeader
