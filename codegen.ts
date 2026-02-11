import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "schema/**/*.graphql",
  documents: ["src/**/*.{ts,tsx,graphql}", "!src/__generated__/**/*"],
  ignoreNoDocuments: true,
  generates: {
    // Client-side: Generate typed queries/mutations with gql function and React hooks
    "./src/__generated__/": {
      preset: "client",
      presetConfig: {
        gqlTagName: "gql",
        fragmentMasking: { unmaskFunctionName: "getFragmentData" },
      },
      config: {
        useTypeImports: true,
        skipTypename: false,
        enumsAsTypes: true,
        scalars: {
          DateTime: "string",
          URL: "string",
          EmailAddress: "string",
          Upload: "File",
          JSON: "any",
        },
        avoidOptionals: {
          field: true,
          inputValue: false,
          object: false,
        },
        nonOptionalTypename: true,
      },
    },
    "./src/__generated__/hooks.tsx": {
      plugins: [
        "typescript",
        "typescript-operations",
        "typescript-react-apollo",
      ],
      config: {
        withHooks: true,
        withComponent: false,
        withHOC: false,
        useTypeImports: true,
        skipTypename: false,
        enumsAsTypes: true,
        scalars: {
          DateTime: "string",
          URL: "string",
          EmailAddress: "string",
          Upload: "File",
          JSON: "any",
        },
        avoidOptionals: {
          field: true,
          inputValue: false,
        },
        defaultScalarType: "unknown",
        strictScalars: true,
      },
    },
    "./src/__generated__/types.ts": {
      plugins: ["typescript"],
      config: {
        useTypeImports: true,
        skipTypename: false,
        enumsAsTypes: true,
        scalars: {
          DateTime: "string",
          URL: "string",
          EmailAddress: "string",
          Upload: "File",
          JSON: "any",
        },
        maybeValue: "T | null | undefined",
        inputMaybeValue: "T | null | undefined",
        avoidOptionals: {
          field: true,
          inputValue: false,
          object: false,
          defaultValue: false,
        },
        nonOptionalTypename: true,
      },
    },
    "./src/__generated__/resolvers-types.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        useTypeImports: true,
        contextType: "../apollo/context#GraphQLContext",
        scalars: {
          DateTime: "string",
          URL: "string",
          EmailAddress: "string",
          Upload: "File",
          JSON: "any",
        },
        enumsAsTypes: true,
        avoidOptionals: {
          field: true,
          inputValue: false,
          object: false,
        },
        defaultMapper: "Partial<{T}>",
      },
    },
  },
};

export default config;
