import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "src/apollo/type-defs.ts",
  documents: ["src/**/*.{ts,tsx,graphql}", "!src/__generated__/**/*"],
  ignoreNoDocuments: true,
  generates: {
    // Client-side: Generate typed queries/mutations with gql function and React hooks
    "./src/__generated__/": {
      preset: "client",
      presetConfig: {
        gqlTagName: "gql",
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
      },
    },
  },
};

export default config;
