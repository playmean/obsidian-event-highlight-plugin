import { Plugin, moment, setIcon, setTooltip } from 'obsidian';

export default class EventHighlightPlugin extends Plugin {
    private attributeName = 'data-datey';

    private renderElement(el: Element, source: string) {
        const parsedDate = moment(source, 'YYYY-MM-DD', true);
        const parsedDateTime = moment(source, 'YYYY-MM-DD HH:mm', true);

        const isDateTime = parsedDateTime.isValid();

        const workFormat = isDateTime ? 'DD.MM.YYYY HH:mm' : 'DD.MM.YYYY';
        const workStamp = isDateTime ? parsedDateTime : parsedDate;
        const workGranularity = isDateTime ? 'hour' : 'day';
        const workMinimalGranularity = isDateTime ? 'minute' : 'day';

        const now = moment();

        const isAfter = now.isSameOrAfter(
            moment(workStamp).add(1, 'hour'),
            workMinimalGranularity,
        );
        const isActual = !isAfter && now.isSameOrAfter(workStamp, workMinimalGranularity);
        const isUpcomming =
            !isActual &&
            now.isSame(
                isDateTime ? workStamp : moment(workStamp).subtract(1, 'day'),
                'day',
            );
        const isBefore = !isUpcomming && now.isBefore(workStamp, workGranularity);

        el.innerHTML = '';

        if (isAfter) {
            el.removeAttribute(this.attributeName);
        } else {
            el.setAttribute(this.attributeName, source);
        }

        const dateSpan = el.createEl('div');
        const iconSpan = dateSpan.createEl('div');

        const roundingDefault = moment.relativeTimeRounding();

        moment.relativeTimeRounding(Math.floor);

        moment.relativeTimeThreshold('m', 60);
        moment.relativeTimeThreshold('h', 24);
        moment.relativeTimeThreshold('d', 7);
        moment.relativeTimeThreshold('w', 4);
        moment.relativeTimeThreshold('M', 12);

        const workFormatted = workStamp.format(workFormat);
        const workFromNow =
            !isUpcomming && workStamp.diff(now, 'days') < 7
                ? workStamp.format('dddd').toLocaleLowerCase()
                : workStamp.fromNow();

        moment.relativeTimeRounding(roundingDefault);

        dateSpan.createEl('div', {
            text: isAfter
                ? workFormatted
                : `${workFromNow.slice(0, 1).toLocaleUpperCase()}${workFromNow.slice(1)}`,
        });

        iconSpan.style.display = 'inline-flex';
        iconSpan.style.alignItems = 'center';

        dateSpan.style.display = 'inline-flex';
        dateSpan.style.alignItems = 'center';
        dateSpan.style.gap = '4px';
        dateSpan.style.borderRadius = '4px';
        dateSpan.style.padding = '2px 4px';
        dateSpan.style.userSelect = 'none';
        dateSpan.style.cursor = 'default';

        switch (true) {
            case isAfter:
                dateSpan.style.backgroundColor = '#404040';

                setIcon(iconSpan, 'calendar-check-2');
                setTooltip(dateSpan, `Past event`);

                break;
            case isBefore:
                dateSpan.style.backgroundColor = 'green';

                setIcon(iconSpan, 'calendar');
                setTooltip(dateSpan, `Event soon (${workFormatted})`);

                break;
            case isUpcomming:
                dateSpan.style.backgroundColor = '#e0a500';
                dateSpan.style.color = '#333333';

                setIcon(iconSpan, 'calendar-clock');
                setTooltip(dateSpan, `Upcoming event (${workFormatted})`);

                break;
            case isActual:
                dateSpan.style.backgroundColor = 'purple';
                dateSpan.style.fontWeight = 'bold';

                setIcon(iconSpan, 'clock');
                setTooltip(dateSpan, `Event started (${workFormatted})`);

                break;
        }
    }

    private updateAllPage() {
        const elements = document.querySelectorAll(`[${this.attributeName}]`);

        elements.forEach((el) => {
            const source = el.getAttribute(this.attributeName);

            if (!source) return;

            this.renderElement(el, source);
        });
    }

    async onload() {
        this.registerMarkdownCodeBlockProcessor('datey', (source, el, ctx) => {
            this.renderElement(el, source.trim());
        });

        this.registerEvent(
            this.app.workspace.on('active-leaf-change', () => {
                this.updateAllPage();
            }),
        );

        this.registerInterval(
            window.setInterval(() => {
                this.updateAllPage();
            }, 10_000),
        );
    }
}
