"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Flex, Badge, Button, Dialog, TextField, Box, Text, IconButton } from "@radix-ui/themes";
import { GearIcon, Cross2Icon } from "@radix-ui/react-icons";
import { useMutation, useQuery } from "@apollo/client";
import {
  GetUserSettingsDocument,
  UpdateUserSettingsDocument,
} from "@/__generated__/hooks";

export function UserPreferences() {
  const { userId, isLoaded } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [locations, setLocations] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState("");
  const [skillInput, setSkillInput] = useState("");

  // Fetch user settings
  const { data: settingsData, loading: queryLoading, error: queryError } = useQuery(
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
    }
  }, [settingsData]);

  const addLocation = () => {
    if (locationInput.trim() && !locations.includes(locationInput.trim())) {
      const newLocations = [...locations, locationInput.trim()];
      setLocations(newLocations);
      setLocationInput("");
      updateSettings({
        variables: {
          userId: userId || "",
          settings: {
            preferred_locations: newLocations,
            preferred_skills: skills,
          },
        },
      });
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      const newSkills = [...skills, skillInput.trim()];
      setSkills(newSkills);
      setSkillInput("");
      updateSettings({
        variables: {
          userId: userId || "",
          settings: {
            preferred_locations: locations,
            preferred_skills: newSkills,
          },
        },
      });
    }
  };

  const removeLocation = (location: string) => {
    const newLocations = locations.filter((l) => l !== location);
    setLocations(newLocations);
    updateSettings({
      variables: {
        userId: userId || "",
        settings: {
          preferred_locations: newLocations,
          preferred_skills: skills,
        },
      },
    });
  };

  const removeSkill = (skill: string) => {
    const newSkills = skills.filter((s) => s !== skill);
    setSkills(newSkills);
    updateSettings({
      variables: {
        userId: userId || "",
        settings: {
          preferred_locations: locations,
          preferred_skills: newSkills,
        },
      },
    });
  };

  if (!isLoaded || !userId) {
    return null;
  }

  if (queryError) {
    console.error("Error fetching user preferences:", queryError);
  }

  return (
    <Box mb="4">
      <Flex gap="2" wrap="wrap" mb="2" align="center">
        {locations.length > 0 && (
          <Flex gap="2" align="center">
            <Text size="1" color="gray">
              Locations:
            </Text>
            {locations.map((location) => (
              <Flex key={location} align="center" gap="1">
                <Badge variant="soft">{location}</Badge>
                <IconButton
                  size="1"
                  variant="ghost"
                  onClick={() => removeLocation(location)}
                  aria-label={`Remove ${location}`}
                >
                  <Cross2Icon width="14" height="14" />
                </IconButton>
              </Flex>
            ))}
          </Flex>
        )}

        {skills.length > 0 && (
          <Flex gap="2" align="center">
            <Text size="1" color="gray">
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
                  onClick={() => removeSkill(skill)}
                  aria-label={`Remove ${skill}`}
                >
                  <Cross2Icon width="14" height="14" />
                </IconButton>
              </Flex>
            ))}
          </Flex>
        )}

        <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
          <Dialog.Trigger>
            <Button variant="ghost" size="2">
              <GearIcon /> Preferences
            </Button>
          </Dialog.Trigger>

          <Dialog.Content>
            <Dialog.Title>Your Preferences</Dialog.Title>
            <Dialog.Description>
              Set your preferred locations and skills to filter job results.
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
                      <Badge variant="solid">{location}</Badge>
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
