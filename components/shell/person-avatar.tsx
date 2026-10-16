import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function PersonAvatar({
  name,
  color,
  src,
  className,
}: {
  name: string;
  color: string;
  src?: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn("size-7 rounded-full", className)}>
      {src ? <AvatarImage src={src} alt="" referrerPolicy="no-referrer" /> : null}
      <AvatarFallback className="text-xs font-semibold text-white" style={{ backgroundColor: color }}>
        {name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
