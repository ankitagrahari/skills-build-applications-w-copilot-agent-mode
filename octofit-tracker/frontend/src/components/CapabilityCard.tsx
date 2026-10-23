import { useEffect, useState } from 'react';

type Props<T> = {
  title: string;
  description: string;
  emptyMessage: string;
  load: () => Promise<T[]>;
  renderItem: (item: T) => React.ReactNode;
};

export function CapabilityCard<T>({ title, description, emptyMessage, load, renderItem }: Props<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    load().then((results) => {
      if (active) setItems(results);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'An unexpected error occurred.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [load]);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">{title}</h2>
        <p>{description}</p>
        {loading ? <p role="status">Loading {title.toLowerCase()}...</p>
          : error ? <p role="alert">Unable to load {title.toLowerCase()}: {error}</p>
            : items.length === 0 ? <p>{emptyMessage}</p>
              : <ul>{items.map((item, index) => <li key={index}>{renderItem(item)}</li>)}</ul>}
      </div>
    </section>
  );
}
