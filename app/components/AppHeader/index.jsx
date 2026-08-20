import React from "react"
import { Button, UnstyledButton } from "@mantine/core"
import { useSelector } from "react-redux"
import { selectAuth } from "app/core/auth"
import AuthMenu from "app/core/auth/AuthMenu"
import { showModal } from "app/core/modals"
import AuthModal from "app/core/auth/AuthModal"
import history from "app/core/history"
import { cn } from "app/core"


const AppHeader = () => {
  const { account } = useSelector(() => selectAuth()) || {}

  return (
    <header
      className={cn(
        "flex shrink-0 items-center justify-between gap-3 border-b border-cs-border bg-cs-bg/88 px-3 py-2",
        "pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-[1rem]"
      )}
    >
      <UnstyledButton
        className="font-sans text-[0.875rem] font-semibold leading-normal tracking-[0.02em] text-cs-accent"
        onClick={() => history.push("/")}
      >
        casino<span className="text-cs-muted">·syndicate</span>
      </UnstyledButton>
      <div className="flex shrink-0 items-center gap-3">
        {account && <AuthMenu />}
        {!account &&
          <Button
            variant="subtle"
            color="gray"
            onClick={() => showModal(AuthModal)}
          >
            Connect
          </Button>
        }
      </div>
    </header>
  )
}

export default AppHeader
