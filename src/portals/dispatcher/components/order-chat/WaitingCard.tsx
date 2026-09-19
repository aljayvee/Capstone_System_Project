import { Hourglass } from "lucide-react";
import { DispatcherButton } from "@/components/panel/DispatcherButton";

/**
 * What we're waiting for, how long it's been, and what to do meanwhile.
 *
 * Replaces the grey "Pending" pill, which told a dispatcher nothing: not what
 * had been sent, not how long ago, and not what they could usefully do instead
 * of watching it.
 *
 * On the route board it wears the console's one waiting pair rather than its
 * own amber, and its actions are real 36px buttons: they were 11px text on a
 * 24px box, offered to someone who is reading this precisely because they are
 * looking for something else to do.
 */
interface WaitingCardProps {
  title: string;
  detail: string;
  actions?: Array<{ label: string; onClick: () => void }>;
}

export function WaitingCard({ title, detail, actions = [] }: WaitingCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-plate bg-status-waiting-fill p-3">
      <Hourglass size={16} className="mt-0.5 shrink-0 text-status-waiting-ink" />
      <div className="min-w-0 flex-1">
        <p className="m-0 text-label text-status-waiting-ink">{title}</p>
        <p className="mb-0 mt-1 text-body text-status-waiting-ink/85">{detail}</p>
        {actions.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {actions.map((a) => (
              <DispatcherButton key={a.label} type="button" size="sm" variant="secondary" onClick={a.onClick}>
                {a.label}
              </DispatcherButton>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
