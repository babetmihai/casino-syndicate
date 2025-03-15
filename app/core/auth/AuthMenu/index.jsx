import React from "react"
import "./index.scss"
import { Menu, Avatar } from "@mantine/core"
import { Logout } from "tabler-icons-react"
import { selectAuth, logout } from "app/core/auth"
import { useSelector } from "react-redux"


const AuthMenu = () => {
  const { account } = useSelector(() => selectAuth())
  return (
    <div className="AuthMenu_root">
      <Menu withArrow>
        <Menu.Target>
          <Avatar
            size="md"
            radius="xl"
          >
            {account.replace(/\d/g, "").toUpperCase().slice(0, 2)}
          </Avatar>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>
            {`Connected: ${account.slice(0, 8)}...`}
          </Menu.Label>
          <Menu.Item
            onClick={() => logout()}
            leftSection={<Logout />}
          >
            Logout
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </div>
  )
}

export default AuthMenu