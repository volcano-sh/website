import React from 'react';

interface FigureProps {
    src: string;
    title?: string;
    alt?: string;
    width?: string;
}

const Figure: React.FC<FigureProps> = ({ src, title, alt, width }) => {
    return (
        <figure style={{ textAlign: 'center', margin: '1.5rem 0' }}>
            <img
                src={src}
                alt={alt || title || 'Figure'}
                style={{
                    maxWidth: width || '100%',
                    height: 'auto',
                    display: 'block',
                    margin: '0 auto',
                }}
            />
            {title && (
                <figcaption style={{ marginTop: '0.5rem', fontStyle: 'italic', color: '#666' }}>
                    {title}
                </figcaption>
            )}
        </figure>
    );
};

export default Figure;
