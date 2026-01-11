// Helper function to get emotion-based styling (fallback for when no acoustic metrics)
const getEmotionalStyle = (loudness: string, pitch: string, speed: string) => {
    const styles: any = {};
    switch (loudness?.toLowerCase()) {
        case 'high': styles.fontWeight = 800; break;
        case 'low': styles.fontWeight = 300; break;
        default: styles.fontWeight = 400;
    }
    switch (pitch?.toLowerCase()) {
        case 'high': styles.color = '#facc15'; break;
        case 'low': styles.color = '#9333ea'; break;
        default: styles.color = 'inherit';
    }
    switch (speed?.toLowerCase()) {
        case 'fast': styles.letterSpacing = '-0.05em'; break;
        case 'slow': styles.letterSpacing = '0.1em'; break;
        default: styles.letterSpacing = '0';
    }
    return styles;
};

export default getEmotionalStyle;
