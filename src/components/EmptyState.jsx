export default function EmptyState({
  title,
  description,
  action,
  framed = true,
}) {
  return (
    <section className={framed ? "screen-card empty-state" : "empty-state"}>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </section>
  );
}
