import React, { createContext, useContext, useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { themeColors, ThemeColor } from '../utils/theme';

interface ThemeContextType {
    colorTheme: ThemeColor;
    setColorTheme: (color: ThemeColor) => void;
    themeClasses: typeof themeColors['indigo'];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [colorTheme, setColorThemeState] = useState<ThemeColor>('indigo');

    useEffect(() => {
        const loadTheme = async () => {
            const { value } = await Preferences.get({ key: 'color_theme' });
            if (value && themeColors[value as ThemeColor]) {
                setColorThemeState(value as ThemeColor);
            }
        };
        loadTheme();
    }, []);

    const setColorTheme = async (color: ThemeColor) => {
        setColorThemeState(color);
        await Preferences.set({ key: 'color_theme', value: color });
    };

    return (
        <ThemeContext.Provider value={{ colorTheme, setColorTheme, themeClasses: themeColors[colorTheme] }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
