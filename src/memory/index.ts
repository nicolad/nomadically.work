/**
 * Memory Module
 *
 * Centralized memory and personalization functionality:
 * - User preferences with evidence tracking
 * - Personalization and recommendation agents
 * - Working memory for user context
 */

export {
  PreferenceManager,
  preferenceManager,
  PREFERENCE_FIELDS,
  PREFERENCE_SOURCES,
  preferenceValueSchema,
  preferenceSchema,
  type Preference,
  type PreferenceField,
  type PreferenceSource,
} from "./preferences";

export {
  personalizationAgent,
  recommendationAgent,
  syncPreferencesToWorkingMemory,
  capturePreferenceFromAction,
} from "./agents";
