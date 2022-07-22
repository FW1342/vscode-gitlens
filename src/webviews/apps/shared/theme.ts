/*global window document MutationObserver*/
import { darken, lighten, opacity } from './colors';

export function initializeAndWatchThemeColors(callback?: () => void) {
	const onColorThemeChanged = () => {
		const body = document.body;
		const computedStyle = window.getComputedStyle(body);

		const bodyStyle = body.style;

		bodyStyle.setProperty('--font-family', computedStyle.getPropertyValue('--vscode-font-family').trim());
		bodyStyle.setProperty('--font-size', computedStyle.getPropertyValue('--vscode-font-size').trim());
		bodyStyle.setProperty('--font-weight', computedStyle.getPropertyValue('--vscode-font-weight').trim());

		bodyStyle.setProperty(
			'--editor-font-family',
			computedStyle.getPropertyValue('--vscode-editor-font-family').trim(),
		);
		bodyStyle.setProperty('--editor-font-size', computedStyle.getPropertyValue('--vscode-editor-font-size').trim());
		bodyStyle.setProperty(
			'--editor-font-weight',
			computedStyle.getPropertyValue('--vscode-editor-font-weight').trim(),
		);

		let color = computedStyle.getPropertyValue('--vscode-editor-background').trim();
		bodyStyle.setProperty('--color-background', color);
		bodyStyle.setProperty('--color-background--lighten-05', lighten(color, 5));
		bodyStyle.setProperty('--color-background--darken-05', darken(color, 5));
		bodyStyle.setProperty('--color-background--lighten-075', lighten(color, 7.5));
		bodyStyle.setProperty('--color-background--darken-075', darken(color, 7.5));
		bodyStyle.setProperty('--color-background--lighten-15', lighten(color, 15));
		bodyStyle.setProperty('--color-background--darken-15', darken(color, 15));
		bodyStyle.setProperty('--color-background--lighten-30', lighten(color, 30));
		bodyStyle.setProperty('--color-background--darken-30', darken(color, 30));
		bodyStyle.setProperty('--color-background--lighten-50', lighten(color, 50));
		bodyStyle.setProperty('--color-background--darken-50', darken(color, 50));

		color = computedStyle.getPropertyValue('--vscode-button-background').trim();
		bodyStyle.setProperty('--color-button-background', color);
		bodyStyle.setProperty('--color-button-background--darken-30', darken(color, 30));

		color = computedStyle.getPropertyValue('--vscode-button-secondaryBackground').trim();
		bodyStyle.setProperty('--color-button-secondary-background', color);
		bodyStyle.setProperty('--color-button-secondary-background--darken-30', darken(color, 30));

		color = computedStyle.getPropertyValue('--vscode-button-background').trim();
		bodyStyle.setProperty('--color-highlight', color);
		bodyStyle.setProperty('--color-highlight--75', opacity(color, 75));
		bodyStyle.setProperty('--color-highlight--50', opacity(color, 50));
		bodyStyle.setProperty('--color-highlight--25', opacity(color, 25));

		color = computedStyle.getPropertyValue('--vscode-button-foreground').trim();
		bodyStyle.setProperty('--color-button-foreground', color);

		let foregroundColor = computedStyle.getPropertyValue('--vscode-editor-foreground').trim();
		if (!foregroundColor) {
			foregroundColor = computedStyle.getPropertyValue('--vscode-foreground').trim();
		}
		bodyStyle.setProperty('--color-foreground', foregroundColor);
		bodyStyle.setProperty('--color-foreground--85', opacity(foregroundColor, 85));
		bodyStyle.setProperty('--color-foreground--75', opacity(foregroundColor, 75));
		bodyStyle.setProperty('--color-foreground--65', opacity(foregroundColor, 65));
		bodyStyle.setProperty('--color-foreground--50', opacity(foregroundColor, 50));

		color = computedStyle.getPropertyValue('--vscode-focusBorder').trim();
		bodyStyle.setProperty('--color-focus-border', color);

		color = computedStyle.getPropertyValue('--vscode-textLink-foreground').trim();
		bodyStyle.setProperty('--color-link-foreground', color);
		bodyStyle.setProperty('--color-link-foreground--darken-20', darken(color, 20));
		bodyStyle.setProperty('--color-link-foreground--lighten-20', lighten(color, 20));

		color = computedStyle.getPropertyValue('--vscode-sideBar-foreground').trim();
		bodyStyle.setProperty('--color-view-foreground', color || foregroundColor);

		bodyStyle.setProperty(
			'--color-view-header-foreground',
			computedStyle.getPropertyValue('--vscode-sideBarSectionHeader-foreground').trim() ||
				color ||
				foregroundColor,
		);

		color = computedStyle.getPropertyValue('--vscode-editorHoverWidget-background').trim();
		bodyStyle.setProperty('--color-hover-background', color);
		color = computedStyle.getPropertyValue('--vscode-editorHoverWidget-border').trim();
		bodyStyle.setProperty('--color-hover-border', color);
		color = computedStyle.getPropertyValue('--vscode-editorHoverWidget-foreground').trim();
		bodyStyle.setProperty('--color-hover-foreground', color);
		color = computedStyle.getPropertyValue('--vscode-editorHoverWidget-statusBarBackground').trim();
		bodyStyle.setProperty('--color-hover-statusBarBackground', color);

		// graph-specific colors
		const isLightTheme = body.className.includes('vscode-light') || body.className.includes('vscode-high-contrast-light');
		color = computedStyle.getPropertyValue('--vscode-editor-background').trim();
		bodyStyle.setProperty('--graph-panel-bg', isLightTheme ? darken(color, 5) : lighten(color, 5));
		bodyStyle.setProperty('--graph-theme-opacity-factor', isLightTheme ? '0.5' : '1');

		callback?.();
	};

	const observer = new MutationObserver(onColorThemeChanged);

	observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

	onColorThemeChanged();
	return observer;
}
