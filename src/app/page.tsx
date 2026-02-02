import { Suspense } from "react";
import { JobsProvider } from "@/components/jobs-provider";
import styles from "./page.module.css";

const Page = () => {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <div className={styles.content}>
        <JobsProvider />
      </div>
    </Suspense>
  );
};

export default Page;
