"use client";

import * as React from "react";
import { useState } from "react";
import {
  Container,
  Text,
  Heading,
  Flex,
  Card,
  Box,
  Badge,
  Button,
  TextField,
  TextArea,
  Separator,
  Table,
  Code,
  Spinner,
  Callout,
} from "@radix-ui/themes";
import {
  ChatBubbleIcon,
  PlusIcon,
  PersonIcon,
  LightningBoltIcon,
  CopyIcon,
  LockClosedIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { useAuth } from "@/lib/auth-hooks";
import {
  useTextToSqlLazyQuery,
  useExecuteSqlLazyQuery,
} from "@/__generated__/hooks";

interface SqlResult {
  sql: string;
  explanation?: string;
  columns: string[];
  rows: Array<Array<string | number | boolean | null>>;
  drilldownSearchQuery?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sqlResult?: SqlResult;
  isLoading?: boolean;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export function ChatsProvider() {
  const { user, loading: authLoading } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [topQueryInput, setTopQueryInput] = useState("");

  const [executeTextToSql, { loading: textToSqlLoading }] =
    useTextToSqlLazyQuery();
  const [executeSqlQuery, { loading: sqlQueryLoading }] =
    useExecuteSqlLazyQuery();

  const selectedChat = selectedChatId
    ? chats.find((c) => c.id === selectedChatId)
    : null;

  const isLoading = textToSqlLoading || sqlQueryLoading;

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setChats([newChat, ...chats]);
    setSelectedChatId(newChat.id);
    return newChat.id;
  };

  const executeQuery = async (content: string, chatId: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content,
      timestamp: new Date(),
    };

    const input = content.trim();
    const isSqlQuery =
      input.toLowerCase().startsWith("select") ||
      input.toLowerCase().startsWith("with") ||
      input.toLowerCase().includes("sql:") ||
      input.startsWith("/sql");

    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              messages: [...chat.messages, userMessage],
              updatedAt: new Date(),
              title:
                chat.messages.length === 0
                  ? content.slice(0, 30) + (content.length > 30 ? "..." : "")
                  : chat.title,
            }
          : chat,
      ),
    );

    // Add loading message
    const loadingMessageId = (Date.now() + 1).toString();
    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              messages: [
                ...chat.messages,
                {
                  id: loadingMessageId,
                  role: "assistant",
                  content: isSqlQuery
                    ? "Executing SQL query..."
                    : "Processing your request...",
                  timestamp: new Date(),
                  isLoading: true,
                },
              ],
            }
          : chat,
      ),
    );

    try {
      if (isSqlQuery) {
        // Execute SQL query
        const cleanSql = input
          .replace(/^\/sql\s+/i, "")
          .replace(/^sql:\s*/i, "");
        const isRawSql =
          cleanSql.toLowerCase().startsWith("select") ||
          cleanSql.toLowerCase().startsWith("with");

        let result;
        if (isRawSql) {
          // Execute raw SQL
          const { data } = await executeSqlQuery({
            variables: { sql: cleanSql },
          });
          result = data?.executeSql;
        } else {
          // Text to SQL
          const { data } = await executeTextToSql({
            variables: { question: cleanSql },
          });
          result = data?.textToSql;
        }

        if (result) {
          const sqlResult: SqlResult = {
            sql: result.sql,
            explanation: result.explanation ?? undefined,
            columns: result.columns,
            rows: result.rows.map((row) =>
              (row ?? []).map(
                (cell) => cell as string | number | boolean | null,
              ),
            ),
            drilldownSearchQuery: result.drilldownSearchQuery ?? undefined,
          };

          // Replace loading message with result
          setChats((prevChats) =>
            prevChats.map((chat) =>
              chat.id === chatId
                ? {
                    ...chat,
                    messages: chat.messages.map((msg) =>
                      msg.id === loadingMessageId
                        ? {
                            ...msg,
                            content: "Here are the query results:",
                            sqlResult,
                            isLoading: false,
                          }
                        : msg,
                    ),
                    updatedAt: new Date(),
                  }
                : chat,
            ),
          );
        }
      } else {
        // Regular message - simulate response
        setTimeout(() => {
          setChats((prevChats) =>
            prevChats.map((chat) =>
              chat.id === chatId
                ? {
                    ...chat,
                    messages: chat.messages.map((msg) =>
                      msg.id === loadingMessageId
                        ? {
                            ...msg,
                            content:
                              "This is a simulated response. Try asking a SQL query by starting with 'SELECT', '/sql', or 'sql:' to query the database!",
                            isLoading: false,
                          }
                        : msg,
                    ),
                    updatedAt: new Date(),
                  }
                : chat,
            ),
          );
        }, 1000);
      }
    } catch (error) {
      // Replace loading message with error
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                messages: chat.messages.map((msg) =>
                  msg.id === loadingMessageId
                    ? {
                        ...msg,
                        content: `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
                        isLoading: false,
                      }
                    : msg,
                ),
              }
            : chat,
        ),
      );
    }
  };

  const handleTopQuerySubmit = async () => {
    if (!topQueryInput.trim() || isLoading) return;

    // Create new chat if none selected
    let chatId = selectedChatId;
    if (!chatId) {
      chatId = createNewChat();
    }

    // Execute the query
    await executeQuery(topQueryInput, chatId);
    setTopQueryInput("");
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedChatId || isLoading) return;
    await executeQuery(messageInput, selectedChatId);
    setMessageInput("");
  };

  return (
    <Container size="4" p="4">
      <Flex direction="column" gap="4">
        <Flex justify="between" align="center">
          <Heading size="8">
            <Flex align="center" gap="2">
              <LightningBoltIcon width="32" height="32" />
              Query with SQL
            </Flex>
          </Heading>
          <Button onClick={createNewChat} size="3" disabled={isLoading}>
            <PlusIcon /> New Chat
          </Button>
        </Flex>

        {authLoading && (
          <Card size="3">
            <Flex direction="column" gap="4" align="center" py="6">
              <Spinner size="3" />
              <Text color="gray">Loading...</Text>
            </Flex>
          </Card>
        )}

        {!authLoading && !user && (
          <Card size="3">
            <Flex direction="column" gap="4" align="center" py="6">
              <LockClosedIcon width="48" height="48" />
              <Flex direction="column" gap="2" align="center">
                <Heading size="5">Authentication Required</Heading>
                <Text color="gray" align="center">
                  Please sign in to query the database with SQL
                </Text>
              </Flex>
              <Flex gap="3">
                <Link href="/sign-in">
                  <Button size="3" variant="soft">
                    Sign In
                  </Button>
                </Link>
                <Link href="/sign-up">
                  <Button size="3">Sign Up</Button>
                </Link>
              </Flex>
            </Flex>
          </Card>
        )}

        {!authLoading && user && (
          <Flex direction="column" gap="4">
            {/* Top Query Input */}
            <Box>
              <Flex gap="2" align="end">
                <Box style={{ flex: 1 }}>
                  <TextArea
                    placeholder="Enter your SQL query or natural language question..."
                    value={topQueryInput}
                    onChange={(e) => setTopQueryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        void handleTopQuerySubmit();
                      }
                    }}
                    rows={2}
                    disabled={isLoading}
                    style={{ width: "100%" }}
                  />
                </Box>
                <Button
                  onClick={() => void handleTopQuerySubmit()}
                  size="3"
                  disabled={isLoading || !topQueryInput.trim()}
                >
                  {isLoading ? (
                    <>
                      <Spinner />
                      Running
                    </>
                  ) : (
                    <>
                      <LightningBoltIcon />
                      Query
                    </>
                  )}
                </Button>
              </Flex>
              <Text size="1" color="gray" mt="2" as="div">
                💡 Tip: Press <Code>Cmd/Ctrl + Enter</Code> to run • Use{" "}
                <Code>/sql</Code> or start with <Code>SELECT</Code> for SQL
                queries
              </Text>
            </Box>

            {/* Chat Interface */}
            <Flex gap="4" style={{ height: "calc(100vh - 340px)" }}>
              {/* Chat List Sidebar */}
              <Box
                style={{
                  width: "300px",
                  borderRight: "1px solid var(--gray-6)",
                  overflowY: "auto",
                }}
              >
                <Flex direction="column" gap="2">
                  {chats.length === 0 ? (
                    <Box p="4">
                      <Text color="gray" size="2">
                        No queries yet. Create a new chat to start querying the
                        database.
                      </Text>
                    </Box>
                  ) : (
                    chats.map((chat) => (
                      <Card
                        key={chat.id}
                        style={{
                          cursor: "pointer",
                          backgroundColor:
                            selectedChatId === chat.id
                              ? "var(--accent-3)"
                              : undefined,
                        }}
                        onClick={() => setSelectedChatId(chat.id)}
                      >
                        <Box p="3">
                          <Text weight="bold" size="2">
                            {chat.title}
                          </Text>
                          <Text color="gray" size="1">
                            {chat.messages.length} messages
                          </Text>
                        </Box>
                      </Card>
                    ))
                  )}
                </Flex>
              </Box>

              {/* Chat Messages Area */}
              <Flex
                direction="column"
                gap="4"
                style={{ flex: 1, minHeight: 0 }}
              >
                {selectedChat ? (
                  <>
                    {/* Messages */}
                    <Box
                      style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "1rem",
                      }}
                    >
                      <Flex direction="column" gap="4">
                        {selectedChat.messages.length === 0 ? (
                          <Box p="8" style={{ textAlign: "center" }}>
                            <Flex direction="column" gap="3" align="center">
                              <LightningBoltIcon width="32" height="32" />
                              <Text color="gray" size="3" weight="bold">
                                Start querying the database
                              </Text>
                              <Box>
                                <Text color="gray" size="2" as="div">
                                  Examples:
                                </Text>
                                <Text color="gray" size="2" as="div">
                                  • "Top 10 companies hiring React developers"
                                </Text>
                                <Text color="gray" size="2" as="div">
                                  • "SELECT * FROM jobs WHERE remote = true
                                  LIMIT 10"
                                </Text>
                                <Text color="gray" size="2" as="div">
                                  • "/sql Show me all jobs posted in the last 7
                                  days"
                                </Text>
                              </Box>
                            </Flex>
                          </Box>
                        ) : (
                          selectedChat.messages.map((message) => (
                            <Card
                              key={message.id}
                              style={{
                                alignSelf:
                                  message.role === "user"
                                    ? "flex-end"
                                    : "flex-start",
                                maxWidth: message.sqlResult ? "90%" : "70%",
                                backgroundColor:
                                  message.role === "user"
                                    ? "var(--blue-9)"
                                    : "var(--gray-3)",
                              }}
                            >
                              <Box p="3">
                                <Flex direction="column" gap="2">
                                  <Flex align="center" gap="2">
                                    <Badge
                                      color={
                                        message.role === "user"
                                          ? "blue"
                                          : "gray"
                                      }
                                      size="1"
                                    >
                                      {message.role === "user" ? (
                                        <PersonIcon />
                                      ) : message.sqlResult ? (
                                        <LightningBoltIcon />
                                      ) : (
                                        <ChatBubbleIcon />
                                      )}
                                    </Badge>
                                    <Text size="1" color="gray">
                                      {message.timestamp.toLocaleTimeString()}
                                    </Text>
                                  </Flex>
                                  <Text>{message.content}</Text>

                                  {message.isLoading && (
                                    <Flex gap="2" align="center">
                                      <Spinner size="2" />
                                    </Flex>
                                  )}

                                  {message.sqlResult && !message.isLoading && (
                                    <Box mt="3">
                                      <Flex
                                        direction="column"
                                        gap="3"
                                        style={{ width: "100%" }}
                                      >
                                        <Box>
                                          <Text
                                            weight="bold"
                                            size="2"
                                            mb="2"
                                            as="div"
                                          >
                                            Generated SQL
                                          </Text>
                                          <Code
                                            variant="ghost"
                                            style={{
                                              display: "block",
                                              whiteSpace: "pre-wrap",
                                              overflowX: "auto",
                                              padding: 8,
                                              borderRadius: 8,
                                              boxShadow:
                                                "0 0 0 1px var(--gray-a5) inset",
                                              fontSize: "12px",
                                            }}
                                          >
                                            {message.sqlResult.sql}
                                          </Code>
                                        </Box>

                                        {message.sqlResult.explanation && (
                                          <Box>
                                            <Text size="2" color="gray">
                                              {message.sqlResult.explanation}
                                            </Text>
                                          </Box>
                                        )}

                                        {message.sqlResult.rows.length > 0 && (
                                          <Box
                                            style={{
                                              overflowX: "auto",
                                              maxHeight: "400px",
                                              overflowY: "auto",
                                            }}
                                          >
                                            <Table.Root
                                              variant="surface"
                                              size="1"
                                            >
                                              <Table.Header>
                                                <Table.Row>
                                                  {message.sqlResult.columns.map(
                                                    (c) => (
                                                      <Table.ColumnHeaderCell
                                                        key={c}
                                                      >
                                                        {c}
                                                      </Table.ColumnHeaderCell>
                                                    ),
                                                  )}
                                                </Table.Row>
                                              </Table.Header>
                                              <Table.Body>
                                                {message.sqlResult.rows.map(
                                                  (row, idx) => (
                                                    <Table.Row key={idx}>
                                                      {row.map((cell, j) => (
                                                        <Table.Cell key={j}>
                                                          {cell === null ? (
                                                            <Text color="gray">
                                                              NULL
                                                            </Text>
                                                          ) : (
                                                            String(cell)
                                                          )}
                                                        </Table.Cell>
                                                      ))}
                                                    </Table.Row>
                                                  ),
                                                )}
                                              </Table.Body>
                                            </Table.Root>
                                          </Box>
                                        )}

                                        {message.sqlResult.rows.length ===
                                          0 && (
                                          <Callout.Root>
                                            <Callout.Text>
                                              No results found
                                            </Callout.Text>
                                          </Callout.Root>
                                        )}
                                      </Flex>
                                    </Box>
                                  )}
                                </Flex>
                              </Box>
                            </Card>
                          ))
                        )}
                      </Flex>
                    </Box>

                    <Separator size="4" />

                    {/* Message Input */}
                    <Box p="4">
                      <Flex direction="column" gap="2">
                        <Callout.Root size="1" color="blue">
                          <Callout.Text>
                            💡 Tip: Start your message with <Code>/sql</Code>,{" "}
                            <Code>sql:</Code>, or write a <Code>SELECT</Code>{" "}
                            query to query the database
                          </Callout.Text>
                        </Callout.Root>
                        <Flex gap="2">
                          <TextArea
                            placeholder="Ask a question or write a SQL query (e.g., 'SELECT * FROM jobs LIMIT 10')"
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                void sendMessage();
                              }
                            }}
                            style={{ flex: 1 }}
                            rows={3}
                            disabled={isLoading}
                          />
                          <Button
                            onClick={() => void sendMessage()}
                            size="3"
                            disabled={isLoading || !messageInput.trim()}
                          >
                            {isLoading ? <Spinner /> : "Send"}
                          </Button>
                        </Flex>
                      </Flex>
                    </Box>
                  </>
                ) : (
                  <Box p="8" style={{ textAlign: "center" }}>
                    <Flex direction="column" gap="3" align="center">
                      <LightningBoltIcon width="48" height="48" />
                      <Text color="gray" size="4">
                        Select a conversation or create a new one
                      </Text>
                      <Text color="gray" size="2">
                        Query the database with natural language or SQL
                      </Text>
                    </Flex>
                  </Box>
                )}
              </Flex>
            </Flex>
          </Flex>
        )}
      </Flex>
    </Container>
  );
}
