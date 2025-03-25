import { Plugin, moment, setIcon, setTooltip } from 'obsidian';

declare interface State {
    source: string;
    text: string;

    swapped: boolean;

    isActual: boolean;
    isUpcoming: boolean;
    isBefore: boolean;
}

export default class EventHighlightPlugin extends Plugin {
    private attributeStateName = 'data-event-highlight-state';

    private loadState(el: Element): State {
        const stateString = el.getAttribute(this.attributeStateName);

        const [
            source,
            text = '',

            swapped = '',

            isActual = '',
            isUpcoming = '',
            isBefore = '',
        ] = stateString?.split('|') || [''];

        return {
            source,
            text,

            swapped: !!swapped,

            isActual: !!isActual,
            isUpcoming: !!isUpcoming,
            isBefore: !!isBefore,
        };
    }

    private saveState(el: Element, state: State) {
        el.setAttribute(
            this.attributeStateName,
            [
                state.source,
                state.text,

                state.swapped ? '1' : '',

                state.isActual ? '1' : '',
                state.isUpcoming ? '1' : '',
                state.isBefore ? '1' : '',
            ].join('|'),
        );
    }

    private dropState(el: Element) {
        el.removeAttribute(this.attributeStateName);
    }

    private isSameState(oldState: State, newState: State) {
        return JSON.stringify(oldState) === JSON.stringify(newState);
    }

    private renderElement(el: Element, source: string, overrideState?: Partial<State>) {
        const parsedDate = moment(source, 'YYYY-MM-DD', true);
        const parsedDateTime = moment(source, 'YYYY-MM-DD HH:mm', true);

        const isDateTime = parsedDateTime.isValid();

        const workFormat = isDateTime ? 'DD.MM.YYYY HH:mm' : 'DD.MM.YYYY';
        const workStamp = isDateTime ? parsedDateTime : parsedDate;
        const workGranularity = isDateTime ? 'hour' : 'day';
        const workMinimalGranularity = isDateTime ? 'minute' : 'day';

        const now = moment();

        const isAfter = now.isAfter(
            moment(workStamp).add(1, 'hour'),
            workMinimalGranularity,
        );
        const isActual = !isAfter && now.isSameOrAfter(workStamp, workMinimalGranularity);
        const isUpcoming =
            !isActual &&
            now.isSame(
                isDateTime ? workStamp : moment(workStamp).subtract(1, 'day'),
                'day',
            );
        const isBefore = !isUpcoming && now.isBefore(workStamp, workGranularity);

        const roundingDefault = moment.relativeTimeRounding();

        moment.relativeTimeRounding(Math.round);

        moment.relativeTimeThreshold('m', 60);
        moment.relativeTimeThreshold('h', 24);
        moment.relativeTimeThreshold('d', 7);
        moment.relativeTimeThreshold('w', 4);
        moment.relativeTimeThreshold('M', 12);

        const workFormatted = workStamp.format(workFormat);
        const workFromNow = (() => {
            const thisWeek = !isUpcoming && !isActual && workStamp.diff(now, 'days') < 7;

            const nextDayFormat = // fragile, but works
                (
                    moment.localeData() as unknown as {
                        _calendar: Record<string, string>;
                    }
                )._calendar.nextDay;

            if (thisWeek) {
                return workStamp
                    .calendar({
                        nextDay: nextDayFormat.replace('LT', 'HH:mm'),
                        nextWeek: 'dddd',
                        sameElse: 'dddd',
                    })
                    .toLocaleLowerCase();
            }

            return workStamp.fromNow();
        })();

        moment.relativeTimeRounding(roundingDefault);

        const oldState = this.loadState(el);

        const text =
            isAfter || (overrideState || oldState).swapped
                ? workFormatted
                : `${workFromNow.slice(0, 1).toLocaleUpperCase()}${workFromNow.slice(1)}`;

        const state: State = {
            ...oldState,

            source,
            text,

            isActual,
            isUpcoming,
            isBefore,

            ...overrideState,
        };

        if (this.isSameState(oldState, state)) return;

        if (isAfter) {
            this.dropState(el);
        } else {
            this.saveState(el, state);
        }

        el.innerHTML = '';

        const dateSpan = el.createEl('div');
        const iconSpan = dateSpan.createEl('div');

        dateSpan.createEl('div', { text });

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
                setTooltip(dateSpan, 'Past event');

                break;
            case isBefore:
                dateSpan.style.backgroundColor = 'green';

                setIcon(iconSpan, 'calendar');
                setTooltip(dateSpan, `Event soon (${workFormatted})`);

                break;
            case isUpcoming:
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
        const elements = document.querySelectorAll(`[${this.attributeStateName}]`);

        elements.forEach((el) => {
            const { source } = this.loadState(el);

            if (!source) return;

            this.renderElement(el, source);
        });
    }

    async onload() {
        this.registerMarkdownCodeBlockProcessor('event-highlight', (source, el, ctx) => {
            this.renderElement(el, source.trim());

            el.addEventListener('click', () => {
                const { swapped } = this.loadState(el);

                this.renderElement(el, source.trim(), {
                    swapped: !swapped,
                });
            });
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
