"use client";

import { useState } from "react";
import {
  Container,
  Heading,
  Text,
  Flex,
  Card,
  Switch,
  TextField,
  Button,
  Select,
  Separator,
  Box,
} from "@radix-ui/themes";
import Link from "next/link";

export default function SettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(false);
  const [newJobAlerts, setNewJobAlerts] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [jobsPerPage, setJobsPerPage] = useState("50");

  const handleSave = () => {
    // TODO: Save preferences to database or local storage
    console.log("Saving preferences...", {
      emailNotifications,
      dailyDigest,
      newJobAlerts,
      darkMode,
      jobsPerPage,
    });
  };

  return (
    <Container size="3" px="8" py="6">
      <Flex direction="column" gap="6">
        <Flex justify="between" align="center">
          <Heading size="8">Settings</Heading>
          <Link href="/">
            <Button variant="soft">← Back to Jobs</Button>
          </Link>
        </Flex>

        {/* Notifications Settings */}
        <Card size="3">
          <Flex direction="column" gap="4">
            <Heading size="5">Notifications</Heading>
            <Text size="2" color="gray">
              Manage how you receive updates about new job postings
            </Text>

            <Separator size="4" />

            <Flex justify="between" align="center">
              <Flex direction="column" gap="1">
                <Text weight="medium">Email Notifications</Text>
                <Text size="2" color="gray">
                  Receive emails about new job postings
                </Text>
              </Flex>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </Flex>

            <Flex justify="between" align="center">
              <Flex direction="column" gap="1">
                <Text weight="medium">Daily Digest</Text>
                <Text size="2" color="gray">
                  Get a daily summary of new remote jobs
                </Text>
              </Flex>
              <Switch checked={dailyDigest} onCheckedChange={setDailyDigest} />
            </Flex>

            <Flex justify="between" align="center">
              <Flex direction="column" gap="1">
                <Text weight="medium">New Job Alerts</Text>
                <Text size="2" color="gray">
                  Instant notifications for matching jobs
                </Text>
              </Flex>
              <Switch
                checked={newJobAlerts}
                onCheckedChange={setNewJobAlerts}
              />
            </Flex>
          </Flex>
        </Card>

        {/* Job Preferences */}
        <Card size="3">
          <Flex direction="column" gap="4">
            <Heading size="5">Job Preferences</Heading>
            <Text size="2" color="gray">
              Customize your job search experience
            </Text>

            <Separator size="4" />

            <Flex direction="column" gap="2">
              <Text weight="medium">Preferred Locations</Text>
              <TextField.Root
                placeholder="e.g., EU, Remote, Berlin, London..."
                defaultValue=""
              />
              <Text size="1" color="gray">
                Separate multiple locations with commas
              </Text>
            </Flex>

            <Flex direction="column" gap="2">
              <Text weight="medium">Skills & Keywords</Text>
              <TextField.Root
                placeholder="e.g., React, Python, AI/ML, DevOps..."
                defaultValue=""
              />
              <Text size="1" color="gray">
                Jobs matching these skills will be highlighted
              </Text>
            </Flex>

            <Flex direction="column" gap="2">
              <Text weight="medium">Excluded Companies</Text>
              <TextField.Root
                placeholder="e.g., company1, company2..."
                defaultValue=""
              />
              <Text size="1" color="gray">
                Hide jobs from specific companies
              </Text>
            </Flex>
          </Flex>
        </Card>

        {/* Display Settings */}
        <Card size="3">
          <Flex direction="column" gap="4">
            <Heading size="5">Display Settings</Heading>
            <Text size="2" color="gray">
              Personalize how jobs are displayed
            </Text>

            <Separator size="4" />

            <Flex justify="between" align="center">
              <Flex direction="column" gap="1">
                <Text weight="medium">Dark Mode</Text>
                <Text size="2" color="gray">
                  Use dark theme (currently enabled by default)
                </Text>
              </Flex>
              <Switch checked={darkMode} onCheckedChange={setDarkMode} />
            </Flex>

            <Flex direction="column" gap="2">
              <Text weight="medium">Jobs Per Page</Text>
              <Select.Root value={jobsPerPage} onValueChange={setJobsPerPage}>
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value="25">25 jobs</Select.Item>
                  <Select.Item value="50">50 jobs</Select.Item>
                  <Select.Item value="100">100 jobs</Select.Item>
                  <Select.Item value="200">200 jobs</Select.Item>
                </Select.Content>
              </Select.Root>
            </Flex>
          </Flex>
        </Card>

        {/* Account Settings */}
        <Card size="3">
          <Flex direction="column" gap="4">
            <Heading size="5">Account</Heading>
            <Text size="2" color="gray">
              Manage your account settings
            </Text>

            <Separator size="4" />

            <Flex direction="column" gap="2">
              <Text weight="medium">Email Address</Text>
              <TextField.Root
                type="email"
                placeholder="your@email.com"
                defaultValue=""
              />
            </Flex>

            <Box>
              <Button variant="soft" color="red">
                Delete Account
              </Button>
            </Box>
          </Flex>
        </Card>

        {/* Save Button */}
        <Flex justify="end" gap="3">
          <Link href="/">
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Link>
          <Button onClick={handleSave}>Save Preferences</Button>
        </Flex>
      </Flex>
    </Container>
  );
}
