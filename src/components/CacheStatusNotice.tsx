'use client';

type CacheStatusNoticeProps = {
  message: string;
  updatedAt?: number | null;
  prefix?: string;
  className?: string;
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function CacheStatusNotice({
  message,
  updatedAt = null,
  prefix = '更新于',
  className = '',
}: CacheStatusNoticeProps) {
  if (!message) return null;
  return (
    <div className={`card py-2 px-3 text-xs text-dark-300 ${className}`.trim()}>
      {message}
      {updatedAt && <span className="ml-2 text-dark-500">{prefix} {formatTime(updatedAt)}</span>}
    </div>
  );
}
