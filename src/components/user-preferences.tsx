"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Flex,
  Badge,
  Button,
  Dialog,
  TextField,
  Box,
  Text,
  IconButton,
  Separator,
  Callout,
} from "@radix-ui/themes";
import { GearIcon, Cross2Icon, PersonIcon } from "@radix-ui/react-icons";
import { useMutation, useQuery } from "@apollo/client";
import {
  GetUserSettingsDocument,
  UpdateUserSettingsDocument,
} from "@/__generated__/hooks";

export function UserPreferences() {
  const { userId } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [excludedCompanies, setExcludedCompanies] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [companyInput, setCompanyInput] = useState("");

  // Fetch user settings via GQL query
  const { data: settingsData, loading: settingsLoading } = useQuery(
    GetUserSettingsDocument,
    {
      variables: { userId: userId || "" },
      skip: !userId,
    },
  );

  // Update mutation
  const [updateSettings, { loading: updateLoading }] = useMutation(
    UpdateUserSettingsDocument,
  );

  // Initialize from GraphQL data
  useEffect(() => {
    if (settingsData?.userSettings) {
      const settings = settingsData.userSettings;
      setLocations(settings.preferred_locations || []);
      setSkills(settings.preferred_skills || []);
      setExcludedCompanies(settings.excluded_companies || []);
    }
  }, [settingsData]);

  const saveSettings = (overrides: {
    locations?: string[];
    skills?: string[];
    companies?: string[];
  }) => {
    updateSettings({
      variables: {
        userId: userId || "",
        settings: {
          preferred_locations: overrides.locations ?? locations,
          preferred_skills: overrides.skills ?? skills,
          excluded_companies: overrides.companies ?? excludedCompanies,
        },
      },
    });
  };

  const addLocation = () => {
    if (locationInput.trim() && !locations.includes(locationInput.trim())) {
      const newLocations = [...locations, locationInput.trim()];
      setLocations(newLocations);
      setLocationInput("");
      saveSettings({ locations: newLocations });
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      const newSkills = [...skills, skillInput.trim()];
      setSkills(newSkills);
      setSkillInput("");
      saveSettings({ skills: newSkills });
    }
  };

  const addExcludedCompany = () => {
    if (
      companyInput.trim() &&
      !excludedCompanies.includes(companyInput.trim())
    ) {
      const newCompanies = [...excludedCompanies, companyInput.trim()];
      setExcludedCompanies(newCompanies);
      setCompanyInput("");
      saveSettings({ companies: newCompanies });
    }
  };

  const removeLocation = (location: string) => {
    const newLocations = locations.filter((l) => l !== location);
    setLocations(newLocations);
    saveSettings({ locations: newLocations });
  };

  const removeSkill = (skill: string) => {
    const newSkills = skills.filter((s) => s !== skill);
    setSkills(newSkills);
    saveSettings({ skills: newSkills });
  };

  const removeExcludedCompany = (company: string) => {
    const newCompanies = excludedCompanies.filter((c) => c !== company);
    setExcludedCompanies(newCompanies);
    saveSettings({ companies: newCompanies });
  };

  if (!userId) {
    return null;
  }

  const hasPreferences =
    locations.length > 0 || skills.length > 0 || excludedCompanies.length > 0;

  return (
    <Box mb="4">
      {/* Preferences summary panel — shown before search bar */}
      <Flex justify="between" align="start" mb="3">
        <Flex gap="3" wrap="wrap" align="center" style={{ flex: 1 }}>
          {settingsLoading && (
            <Text size="1" color="gray">
              Loading preferences...
            </Text>
          )}

          {!settingsLoading && !hasPreferences && (
            <Callout.Root
              size="1"
              variant="soft"
              color="gray"
              style={{ padding: "6px 12px" }}
            >
              <Callout.Icon>
                <PersonIcon />
              </Callout.Icon>
              <Callout.Text size="1">
                No preferences set. Add locations or skills to filter jobs.
              </Callout.Text>
            </Callout.Root>
          )}

          {locations.length > 0 && (
            <Flex gap="1" align="center" wrap="wrap">
              <Text size="1" color="gray" weight="medium">
                Locations:
              </Text>
              {locations.map((location) => (
                <Flex key={location} align="center" gap="1">
                  <Badge variant="soft" color="teal">
                    {location}
                  </Badge>
                  <IconButton
                    size="1"
                    variant="ghost"
                    color="gray"
                    onClick={() => removeLocation(location)}
                    aria-label={`Remove ${location}`}
                  >
                    <Cross2Icon width="12" height="12" />
                  </IconButton>
                </Flex>
              ))}
            </Flex>
          )}

          {locations.length > 0 && skills.length > 0 && (
            <Separator orientation="vertical" style={{ height: "16px" }} />
          )}

          {skills.length > 0 && (
            <Flex gap="1" align="center" wrap="wrap">
              <Text size="1" color="gray" weight="medium">
                Skills:
              </Text>
              {skills.map((skill) => (
                <Flex key={skill} align="center" gap="1">
                  <Badge variant="soft" color="blue">
                    {skill}
                  </Badge>
                  <IconButton
                    size="1"
                    variant="ghost"
                    color="gray"
                    onClick={() => removeSkill(skill)}
                    aria-label={`Remove ${skill}`}
                  >
                    <Cross2Icon width="12" height="12" />
                  </IconButton>
                </Flex>
              ))}
            </Flex>
          )}

          {(locations.length > 0 || skills.length > 0) &&
            excludedCompanies.length > 0 && (
              <Separator orientation="vertical" style={{ height: "16px" }} />
            )}
        </Flex>

        <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
          <Dialog.Trigger>
            <Button variant="ghost" size="1" color="gray" ml="2">
              <GearIcon /> Edit
            </Button>
          </Dialog.Trigger>

          <Dialog.Content maxWidth="480px">
            <Dialog.Title>Your Preferences</Dialog.Title>
            <Dialog.Description>
              Set preferred locations and skills to personalize job results.
              Exclude companies you&apos;ve already applied to or don&apos;t
              want.
            </Dialog.Description>

            <Box>
              <Box mb="4">
                <Text as="label" size="2" weight="bold" mb="2" display="block">
                  Preferred Locations
                </Text>
                <Flex gap="2" mb="2">
                  <TextField.Root
                    size="2"
                    placeholder="e.g., Berlin, Remote EU"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addLocation();
                      }
                    }}
                    style={{ flex: 1 }}
                  />
                  <Button
                    size="2"
                    onClick={addLocation}
                    disabled={!locationInput.trim() || updateLoading}
                  >
                    Add
                  </Button>
                </Flex>
                <Flex gap="2" wrap="wrap">
                  {locations.map((location) => (
                    <Flex key={location} align="center" gap="1">
                      <Badge variant="solid" color="teal">
                        {location}
                      </Badge>
                      <IconButton
                        size="1"
                        variant="ghost"
                        onClick={() => removeLocation(location)}
                        aria-label={`Remove ${location}`}
                      >
                        <Cross2Icon width="12" height="12" />
                      </IconButton>
                    </Flex>
                  ))}
                </Flex>
              </Box>

              <Box mb="4">
                <Text as="label" size="2" weight="bold" mb="2" display="block">
                  Preferred Skills
                </Text>
                <Flex gap="2" mb="2">
                  <TextField.Root
                    size="2"
                    placeholder="e.g., React, Node.js"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                    style={{ flex: 1 }}
                  />
                  <Button
                    size="2"
                    onClick={addSkill}
                    disabled={!skillInput.trim() || updateLoading}
                  >
                    Add
                  </Button>
                </Flex>
                <Flex gap="2" wrap="wrap">
                  {skills.map((skill) => (
                    <Flex key={skill} align="center" gap="1">
                      <Badge variant="solid" color="blue">
                        {skill}
                      </Badge>
                      <IconButton
                        size="1"
                        variant="ghost"
                        onClick={() => removeSkill(skill)}
                        aria-label={`Remove ${skill}`}
                      >
                        <Cross2Icon width="12" height="12" />
                      </IconButton>
                    </Flex>
                  ))}
                </Flex>
              </Box>
            </Box>

            <Flex gap="3" mt="4" justify="end">
              <Dialog.Close>
                <Button variant="soft" color="gray">
                  Done
                </Button>
              </Dialog.Close>
            </Flex>
          </Dialog.Content>
        </Dialog.Root>
      </Flex>
    </Box>
  );
}
