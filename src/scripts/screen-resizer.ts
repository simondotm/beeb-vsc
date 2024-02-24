import ResizeObserver from 'resize-observer-polyfill';

export class ScreenResizer {
	screen: JQuery<HTMLElement>;
	desiredAspectRatio: number;
	minHeight: number;
	minWidth: number;
	observer: ResizeObserver;

	constructor(screen: JQuery<HTMLElement>) {
		this.screen = screen;
		const origHeight = screen.height();
		const origWidth = screen.width();
		if (origWidth === undefined || origHeight === undefined) {
			throw new Error('ScreenResizer: screen must have a defined height and width');
		}
		this.desiredAspectRatio = origWidth / origHeight;
		this.minHeight = origHeight / 4;
		this.minWidth = origWidth / 4;
		this.observer = new ResizeObserver(() => this.resizeScreen());
		this.observer.observe(this.screen.parent()[0]);
		this.resizeScreen();
	}

	resizeScreen() {
		const InnerBorder = 0;
		const parent = this.screen.parent();
		if (parent === undefined) {
			return;
		}
		const innerWidth = parent.innerWidth();
		const innerHeight = parent.innerHeight();
		if (innerWidth === undefined || innerHeight === undefined) {
			throw new Error('ScreenResizer: screen must have a defined height and width');
		}
		let width = Math.max(this.minWidth, innerWidth - InnerBorder);
		let height = Math.max(this.minHeight, innerHeight - InnerBorder);
		if (width / height <= this.desiredAspectRatio) {
			height = width / this.desiredAspectRatio;
		} else {
			width = height * this.desiredAspectRatio;
		}
		this.screen.height(height).width(width);
	}
}