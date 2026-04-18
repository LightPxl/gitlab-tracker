import { useState, useEffect } from 'react';
import { storage } from '@/lib/storage';

interface GitLabAvatarProps {
    src: string | null;
    alt: string;
    className?: string;
    fallbackColor?: string;
    size?: number;
}

export function GitLabAvatar({ src, alt, className, fallbackColor = 'bg-secondary', size = 40 }: GitLabAvatarProps) {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!src) {
            setImageSrc(null);
            return;
        }

        let isMounted = true;
        let objectUrl: string | null = null;

        // If it sends a full path but we need to add auth headers, we must fetch it.
        // Assuming src is absolute or relative to the gitlab instance.

        const fetchImage = async () => {
            try {
                // Determine if we need to fetch with auth
                const gitlabUrl = storage.getUrl();
                const isGitLabImage = src.includes(gitlabUrl) || src.startsWith('/uploads');
                const isGravatar = src.includes('gravatar.com') || src.includes('dicebear');

                // If it's a public image (Gravatar/Dicebear), just use it directly
                // This avoids CORS issues caused by adding Auth headers to 3rd parties
                if (isGravatar || !isGitLabImage) {
                    setImageSrc(src);
                    return;
                }

                // PROXY HANDLING:
                // If the URL is absolute and matches our GitLab instance (e.g. http://gitlab.lightpxl.com/uploads/...),
                // rewrite it to be relative (e.g. /uploads/...) so it goes through the Vite proxy.
                // This avoids CORS because the browser sees it as a same-origin request.
                let fetchSrc = src;
                const normalizedGitLabUrl = gitlabUrl.replace(/\/$/, ''); // Remove trailing slash
                if (src.startsWith(normalizedGitLabUrl)) {
                    fetchSrc = src.replace(normalizedGitLabUrl, '');
                    // Ensure it starts with /
                    if (!fetchSrc.startsWith('/')) fetchSrc = '/' + fetchSrc;
                }

                const token = storage.getToken();
                if (!token) {
                    setImageSrc(fetchSrc); // Try loading without token
                    return;
                }

                // If the avatar is already a data URL or blob, use it
                if (src.startsWith('data:') || src.startsWith('blob:')) {
                    if (isMounted) setImageSrc(src);
                    return;
                }

                const response = await fetch(fetchSrc, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) throw new Error('Failed to load image');

                const blob = await response.blob();
                objectUrl = URL.createObjectURL(blob);

                if (isMounted) {
                    setImageSrc(objectUrl);
                    setError(false);
                }
            } catch (err) {
                // Fallback to trying the SRC directly if fetch failed (maybe it doesn't need auth)
                if (isMounted) {
                    console.warn("Avatar fetch failed, falling back to direct load", err);
                    setImageSrc(src);
                }
            }
        };

        fetchImage();

        return () => {
            isMounted = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [src]);

    if (!src || error || !imageSrc) {
        return (
            <div
                className={`${className} ${fallbackColor} flex items-center justify-center font-bold text-lg select-none`}
                style={{ width: size, height: size }}
            >
                {alt.charAt(0).toUpperCase()}
            </div>
        );
    }

    return (
        <img
            src={imageSrc}
            alt={alt}
            className={className}
            style={{ width: size, height: size, objectFit: 'cover' }}
            onError={() => setError(true)}
        />
    );
}
