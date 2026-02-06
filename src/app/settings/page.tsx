"use client";

import { useState, useEffect } from "react";
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
import { useUser } from "@clerk/nextjs";
import {
  useGetUserSettingsQuery,
  useUpdateUserSettingsMutation,
} from "@/__generated__/hooks";
import { ApolloProvider, useApollo } from "@/apollo/client";

export const dynamic = "force-dynamic";

function SettingsPageContent() {
  const { user, isLoaded } = useUser();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(false);
  const [newJobAlerts, setNewJobAlerts] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [jobsPerPage, setJobsPerPage] = useState("20");
  const [preferredLocations, setPreferredLocations] = useState("");
  const [preferredSkills, setPreferredSkills] = useState("");
  const [excludedCompanies, setExcludedCompanies] = useState("");

  const { data, loading, refetch } = useGetUserSettingsQuery({
    variables: { userId: user?.id || "" },
    skip: !user?.id,
  });

  const [updateSettings, { loading: updateLoading }] =
    useUpdateUserSettingsMutation();

  // Load settings when data is available
  useEffect(() => {
    if (data?.userSettings) {
      const settings = data.userSettings;
      setEmailNotifications(settings.email_notifications);
      setDailyDigest(settings.daily_digest);
      setNewJobAlerts(settings.new_job_alerts);
      setDarkMode(settings.dark_mode);
      setJobsPerPage(String(settings.jobs_per_page));
      setPreferredLocations(settings.preferred_locations?.join(", ") || "");
      setPreferredSkills(settings.preferred_skills?.join(", ") || "");
      setExcludedCompanies(settings.excluded_companies?.join(", ") || "");
    }
  }, [data]);

  const handleSave = async () => {
    if (!user?.id) {
      alert("You must be signed in to save settings");
      return;
    }

    try {
      await updateSettings({
        variables: {
          userId: user.id,
          settings: {
            email_notifications: emailNotifications,
            daily_digest: dailyDigest,
            new_job_alerts: newJobAlerts,
            dark_mode: darkMode,
            jobs_per_page: parseInt(jobsPerPage, 10),
            preferred_locations: preferredLocations
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            preferred_skills: preferredSkills
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            excluded_companies: excludedCompanies
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          },
        },
      });
      await refetch();
      alert("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings. Please try again.");
    }
  };

  if (!isLoaded || loading) {
    return (
      <Container size="3" px="8" py="6">
        <Text>Loading...</Text>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container size="3" px="8" py="6">
        <Flex direction="column" gap="4">
          <Heading size="8">Settings</Heading>
          <Text>You must be signed in to access settings.</Text>
          <Link href="/">
            <Button>Go to Home</Button>
          </Link>
        </Flex>
      </Container>
    );
  }

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
                value={preferredLocations}
                onChange={(e) => setPreferredLocations(e.target.value)}
              />
              <Text size="1" color="gray">
                Separate multiple locations with commas
              </Text>
            </Flex>

            <Flex direction="column" gap="2">
              <Text weight="medium">Skills & Keywords</Text>
              <TextField.Root
                placeholder="e.g., React, Python, AI/ML, DevOps..."
                value={preferredSkills}
                onChange={(e) => setPreferredSkills(e.target.value)}
              />
              <Text size="1" color="gray">
                Jobs matching these skills will be highlighted
              </Text>
            </Flex>

            <Flex direction="column" gap="2">
              <Text weight="medium">Excluded Companies</Text>
              <TextField.Root
                placeholder="e.g., company1, company2..."
                value={excludedCompanies}
                onChange={(e) => setExcludedCompanies(e.target.value)}
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
                value={user?.primaryEmailAddress?.emailAddress || ""}
                disabled
              />
              <Text size="1" color="gray">
                Email is managed through your account settings
              </Text>
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
          <Button onClick={handleSave} disabled={updateLoading}>
            {updateLoading ? "Saving..." : "Save Preferences"}
          </Button>
        </Flex>
      </Flex>
    </Container>
  );
}

export default function SettingsPage() {
  const apolloClient = useApollo(null);

  return (
    <ApolloProvider client={apolloClient}>
      <SettingsPageContent />
    </ApolloProvider>
  );
}
