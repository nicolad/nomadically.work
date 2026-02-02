import styles from "./skeleton.module.css";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`${styles.skeleton} ${className || ''}`}
      {...props}
    />
  );
}

export { Skeleton };
