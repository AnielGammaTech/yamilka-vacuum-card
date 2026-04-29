import { LitElement, html, nothing } from 'lit';
import type { CSSResultGroup, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import {
  hasConfigOrEntityChanged,
  fireEvent,
  HomeAssistant,
  ServiceCallRequest,
  computeStateDisplay,
  stateIcon,
} from 'custom-card-helpers';
import registerTemplates from 'ha-template';
import get from 'lodash/get';
import localize from './localize';
import styles from './styles.css';
import buildConfig from './config';
import {
  Template,
  VacuumCardAction,
  VacuumCardConfig,
  VacuumEntity,
  HassEntity,
  VacuumBatteryEntity,
  VacuumEntityState,
  VacuumServiceCallParams,
  VacuumActionParams,
  VacuumCardSetting,
} from './types';
import DEFAULT_IMAGE from './vacuum.svg';
import YAMILKA_IMAGE from './yamilka-vacuum.png';

registerTemplates();

// String in the right side will be replaced by Rollup
const PKG_VERSION = 'PKG_VERSION_VALUE';

console.info(
  `%c VACUUM-CARD %c ${PKG_VERSION}`,
  'color: white; background: blue; font-weight: 700;',
  'color: blue; background: white; font-weight: 700;',
);

if (!customElements.get('ha-icon-button')) {
  customElements.define(
    'ha-icon-button',
    class extends (customElements.get('paper-icon-button') ?? HTMLElement) {},
  );
}

@customElement('yamilka-vacuum-card')
export class VacuumCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private config!: VacuumCardConfig;
  @state() private requestInProgress = false;
  @state() private settingsOpen = false;
  @state() private thumbUpdater: ReturnType<typeof setInterval> | null = null;

  static get styles(): CSSResultGroup {
    return styles;
  }

  public static async getConfigElement() {
    await import('./editor');
    return document.createElement('yamilka-vacuum-card-editor');
  }

  static getStubConfig(_: unknown, entities: string[]) {
    const [vacuumEntity] = entities.filter((eid) => eid.startsWith('vacuum'));

    return {
      entity: vacuumEntity ?? '',
    };
  }

  get entity(): VacuumEntity {
    return this.hass.states[this.config.entity] as VacuumEntity;
  }

  get map(): HassEntity | null {
    if (!this.hass || !this.config.map) {
      return null;
    }
    return this.hass.states[this.config.map];
  }

  get batteryEntity(): VacuumBatteryEntity | null {
    const batteryEntityId = this.config.battery_entity;
    if (!this.hass || !batteryEntityId) {
      return null;
    }
    return (this.hass.states[batteryEntityId] as VacuumBatteryEntity) ?? null;
  }

  public setConfig(config: VacuumCardConfig): void {
    this.config = buildConfig(config);
  }

  public getCardSize(): number {
    const baseSize = this.config.compact_view ? 3 : 8;
    return this.settingsOpen ? baseSize + 5 : baseSize;
  }

  public shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps, false);
  }

  protected updated(changedProps: PropertyValues) {
    if (
      changedProps.get('hass') &&
      changedProps.get('hass').states[this.config.entity].state !==
        this.hass.states[this.config.entity].state
    ) {
      this.requestInProgress = false;
    }
  }

  public connectedCallback() {
    super.connectedCallback();
    if (!this.config.compact_view && this.map) {
      this.requestUpdate();
      this.thumbUpdater = setInterval(
        () => this.requestUpdate(),
        this.config.map_refresh * 1000,
      );
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    if (this.map && this.thumbUpdater) {
      clearInterval(this.thumbUpdater);
    }
  }

  private handleMore(entityId: string = this.entity.entity_id): void {
    fireEvent(
      this,
      'hass-more-info',
      {
        entityId,
      },
      {
        bubbles: false,
        composed: true,
      },
    );
  }

  private callService(action: VacuumCardAction) {
    const { service, service_data, target } = action;
    const [domain, name] = service.split('.');
    this.hass.callService(domain, name, service_data, target);
  }

  private callVacuumService(
    service: ServiceCallRequest['service'],
    params: VacuumServiceCallParams = { request: true },
    options: ServiceCallRequest['serviceData'] = {},
  ) {
    this.hass.callService('vacuum', service, {
      entity_id: this.config.entity,
      ...options,
    });

    if (params.request) {
      this.requestInProgress = true;
      this.requestUpdate();
    }
  }

  private handleSpeed(e: CustomEvent<{ item?: { value?: string } }>): void {
    this.callVacuumService(
      'set_fan_speed',
      {
        request: false,
      },
      {
        fan_speed: e.detail.item?.value,
      },
    );
  }

  private renderDropdown({
    icon,
    value,
    options,
    onSelect,
    formatLabel,
    ariaLabel,
  }: {
    icon: string;
    value: string;
    options: string[];
    onSelect: (e: CustomEvent<{ item?: { value?: string } }>) => void;
    formatLabel: (value: string) => string;
    ariaLabel?: string;
  }): Template {
    const selectedLabel = formatLabel(value);

    return html`
      <div class="tip dropdown-tip" @click=${(e: Event) => e.stopPropagation()}>
        <ha-dropdown placement="bottom" @wa-select=${onSelect}>
          <button
            class="dropdown-trigger"
            slot="trigger"
            aria-label=${ariaLabel ?? selectedLabel}
          >
            <ha-icon icon=${icon}></ha-icon>
            <span class="tip-title">${selectedLabel}</span>
            <ha-icon
              class="dropdown-trigger-arrow"
              icon="mdi:menu-down"
            ></ha-icon>
          </button>
          ${repeat(
            options,
            (item) => item,
            (item) => html`
              <ha-dropdown-item .value=${item} ?checked=${item === value}>
                ${formatLabel(item)}
              </ha-dropdown-item>
            `,
          )}
        </ha-dropdown>
      </div>
    `;
  }

  private handleVacuumAction(
    action: string,
    params: VacuumActionParams = { request: true },
  ) {
    return () => {
      if (!this.config.actions[action]) {
        return this.callVacuumService(params.defaultService || action, params);
      }

      this.callService(this.config.actions[action]);
    };
  }

  private getAttributes(entity: VacuumEntity) {
    const { status, state } = entity.attributes;

    return {
      ...entity.attributes,
      status: status ?? state ?? entity.state,
    };
  }

  private renderSource(): Template {
    const { fan_speed: source, fan_speed_list: sources } = this.getAttributes(
      this.entity,
    );

    if (!Array.isArray(sources) || sources.length === 0 || !source) {
      return nothing;
    }

    return this.renderDropdown({
      icon: 'mdi:fan',
      value: source,
      options: sources,
      onSelect: this.handleSpeed,
      formatLabel: (value: string) =>
        localize(`source.${value.toLowerCase()}`) ?? value,
      ariaLabel: localize('source.fan_speed') || 'Fan speed',
    });
  }

  private getBatteryDisplay(): {
    icon: string;
    value: string;
    entityId: string;
  } | null {
    const batteryEntity = this.batteryEntity;

    if (batteryEntity) {
      const value = computeStateDisplay(
        this.hass.localize,
        batteryEntity,
        this.hass.locale,
      );
      const icon = stateIcon(batteryEntity) ?? 'mdi:battery';

      return {
        icon,
        value,
        entityId: batteryEntity.entity_id,
      };
    }

    const { battery_level, battery_icon } = this.getAttributes(this.entity);

    if (battery_level == null) {
      return null;
    }

    return {
      icon: battery_icon ?? 'mdi:battery',
      value: `${battery_level}%`,
      entityId: this.entity.entity_id,
    };
  }

  private renderBattery(): Template {
    const battery = this.getBatteryDisplay();

    if (!battery) {
      return nothing;
    }

    return html`
      <div class="tip" @click="${() => this.handleMore(battery.entityId)}">
        <ha-icon icon="${battery.icon}"></ha-icon>
        <span class="tip-title">${battery.value}</span>
      </div>
    `;
  }

  private hasSettings(): boolean {
    return (
      Array.isArray(this.config.settings) && this.config.settings.length > 0
    );
  }

  private toggleSettings(event: Event): void {
    event.stopPropagation();
    this.settingsOpen = !this.settingsOpen;
  }

  private getSettingEntityId(setting: VacuumCardSetting): string | undefined {
    if (typeof setting === 'string') {
      return setting;
    }

    return setting.entity ?? setting.entity_id;
  }

  private getSettingLabel(setting: VacuumCardSetting): string {
    return typeof setting === 'string' ? setting : (setting.label ?? '');
  }

  private getSettingName(
    entity: HassEntity,
    setting: VacuumCardSetting,
  ): string {
    if (typeof setting !== 'string' && setting.name) {
      return setting.name;
    }

    return entity.attributes.friendly_name ?? entity.entity_id;
  }

  private getSettingIcon(
    entity: HassEntity,
    setting: VacuumCardSetting,
  ): string {
    if (typeof setting !== 'string' && setting.icon) {
      return setting.icon;
    }

    return stateIcon(entity) ?? 'mdi:cog-outline';
  }

  private getDomain(entityId: string): string {
    return entityId.split('.')[0];
  }

  private toggleSwitch(entityId: string): void {
    this.hass.callService('switch', 'toggle', {}, { entity_id: entityId });
  }

  private pressButton(entityId: string): void {
    this.hass.callService('button', 'press', {}, { entity_id: entityId });
  }

  private handleSettingSelect(
    entityId: string,
    event: CustomEvent<{ item?: { value?: string } }>,
  ): void {
    const option = event.detail.item?.value;

    if (!option) {
      return;
    }

    this.hass.callService(
      'select',
      'select_option',
      { option },
      { entity_id: entityId },
    );
  }

  private handleSettingRow(entity: HassEntity): void {
    this.handleMore(entity.entity_id);
  }

  private renderSettingsToggle(): Template {
    if (!this.hasSettings()) {
      return nothing;
    }

    return html`
      <ha-icon-button
        class="settings-toggle"
        label="Settings"
        @click="${this.toggleSettings}"
        ><ha-icon
          icon="${this.settingsOpen ? 'mdi:chevron-up' : 'mdi:tune'}"
        ></ha-icon
      ></ha-icon-button>
    `;
  }

  private renderSettingControl(entity: HassEntity): Template {
    const domain = this.getDomain(entity.entity_id);

    if (domain === 'select' && Array.isArray(entity.attributes.options)) {
      return html`
        <ha-dropdown
          class="settings-dropdown"
          placement="bottom"
          @click=${(event: Event) => event.stopPropagation()}
          @wa-select=${(event: CustomEvent<{ item?: { value?: string } }>) =>
            this.handleSettingSelect(entity.entity_id, event)}
        >
          <button class="settings-dropdown-trigger" slot="trigger">
            <span>${entity.state}</span>
            <ha-icon icon="mdi:menu-down"></ha-icon>
          </button>
          ${repeat(
            entity.attributes.options as string[],
            (item) => item,
            (item) => html`
              <ha-dropdown-item
                .value=${item}
                ?checked=${item === entity.state}
              >
                ${item}
              </ha-dropdown-item>
            `,
          )}
        </ha-dropdown>
      `;
    }

    if (domain === 'switch') {
      return html`
        <ha-switch
          .checked=${entity.state === 'on'}
          @click=${(event: Event) => event.stopPropagation()}
          @change=${() => this.toggleSwitch(entity.entity_id)}
        ></ha-switch>
      `;
    }

    if (domain === 'button') {
      return html`
        <button
          class="settings-row-button"
          @click=${(event: Event) => {
            event.stopPropagation();
            this.pressButton(entity.entity_id);
          }}
        >
          Press
        </button>
      `;
    }

    return html`
      <span class="settings-state">
        ${computeStateDisplay(this.hass.localize, entity, this.hass.locale)}
      </span>
      <ha-icon class="settings-chevron" icon="mdi:chevron-right"></ha-icon>
    `;
  }

  private renderSetting(setting: VacuumCardSetting): Template {
    const entityId = this.getSettingEntityId(setting);

    if (!entityId) {
      const label = this.getSettingLabel(setting);

      return label
        ? html`<div class="settings-section">${label}</div>`
        : nothing;
    }

    const entity = this.hass.states[entityId] as HassEntity | undefined;

    if (!entity) {
      return html`
        <div class="settings-row unavailable">
          <ha-icon icon="mdi:alert-circle-outline"></ha-icon>
          <div class="settings-row-label">
            <span class="settings-row-name">${entityId}</span>
            <span class="settings-row-subtitle">Unavailable</span>
          </div>
        </div>
      `;
    }

    return html`
      <div class="settings-row" @click=${() => this.handleSettingRow(entity)}>
        <ha-icon icon="${this.getSettingIcon(entity, setting)}"></ha-icon>
        <div class="settings-row-label">
          <span class="settings-row-name">
            ${this.getSettingName(entity, setting)}
          </span>
        </div>
        ${this.renderSettingControl(entity)}
      </div>
    `;
  }

  private renderSettingsPanel(): Template {
    if (!this.hasSettings() || !this.settingsOpen) {
      return nothing;
    }

    return html`
      <div class="settings-panel">
        ${this.config.settings.map((setting) => this.renderSetting(setting))}
      </div>
    `;
  }

  private renderMapOrImage(state: VacuumEntityState): Template {
    if (this.config.compact_view) {
      return nothing;
    }

    if (this.map) {
      return this.map && this.map.attributes.entity_picture
        ? html`
            <img
              class="map"
              src="${this.map.attributes.entity_picture}&v=${Date.now()}"
              @click=${() => this.handleMore(this.config.map)}
            />
          `
        : nothing;
    }

    const src =
      this.config.image === 'default'
        ? DEFAULT_IMAGE
        : this.config.image === 'yamilka'
          ? YAMILKA_IMAGE
          : this.config.image;

    return html`
      <img
        class="vacuum ${state}"
        src="${src}"
        @click="${() => this.handleMore()}"
      />
    `;
  }

  private renderStats(state: VacuumEntityState): Template {
    const statsList =
      this.config.stats[state] || this.config.stats.default || [];

    const stats = statsList.map(
      ({ entity_id, attribute, value_template, unit, subtitle }) => {
        if (!entity_id && !attribute) {
          return nothing;
        }

        let state = '';

        if (entity_id && attribute) {
          state = get(this.hass.states[entity_id].attributes, attribute);
        } else if (attribute) {
          state = get(this.entity.attributes, attribute);
        } else if (entity_id) {
          state = this.hass.states[entity_id].state;
        } else {
          return nothing;
        }

        const value = html`
          <ha-template
            hass=${this.hass}
            template=${value_template}
            value=${state}
            variables=${{ value: state }}
          ></ha-template>
        `;

        return html`
          <div class="stats-block" @click="${() => this.handleMore(entity_id)}">
            <span class="stats-value">${value}</span>
            ${unit}
            <div class="stats-subtitle">${subtitle}</div>
          </div>
        `;
      },
    );

    if (!stats.length) {
      return nothing;
    }

    return html`<div class="stats">${stats}</div>`;
  }

  private renderName(): Template {
    const { friendly_name } = this.getAttributes(this.entity);

    if (!this.config.show_name) {
      return nothing;
    }

    return html` <div class="vacuum-name">${friendly_name}</div> `;
  }

  private renderStatus(): Template {
    const { status } = this.getAttributes(this.entity);
    const localizedStatus =
      localize(`status.${status.toLowerCase()}`) || status;

    if (!this.config.show_status) {
      return nothing;
    }

    return html`
      <div class="status">
        ${this.requestInProgress
          ? html`<ha-spinner class="status-spinner" size="tiny"></ha-spinner>`
          : nothing}
        <span class="status-text" alt=${localizedStatus}>
          ${localizedStatus}
        </span>
      </div>
    `;
  }

  private renderToolbar(state: VacuumEntityState): Template {
    if (!this.config.show_toolbar) {
      return nothing;
    }

    switch (state) {
      case 'on':
      case 'auto':
      case 'spot':
      case 'edge':
      case 'single_room':
      case 'cleaning': {
        return html`
          <div class="toolbar">
            <paper-button @click="${this.handleVacuumAction('pause')}">
              <ha-icon icon="hass:pause"></ha-icon>
              ${localize('common.pause')}
            </paper-button>
            <paper-button @click="${this.handleVacuumAction('stop')}">
              <ha-icon icon="hass:stop"></ha-icon>
              ${localize('common.stop')}
            </paper-button>
            <paper-button @click="${this.handleVacuumAction('return_to_base')}">
              <ha-icon icon="hass:home-map-marker"></ha-icon>
              ${localize('common.return_to_base')}
            </paper-button>
          </div>
        `;
      }

      case 'paused': {
        return html`
          <div class="toolbar">
            <paper-button
              @click="${this.handleVacuumAction('resume', {
                defaultService: 'start',
                request: true,
              })}"
            >
              <ha-icon icon="hass:play"></ha-icon>
              ${localize('common.continue')}
            </paper-button>
            <paper-button @click="${this.handleVacuumAction('return_to_base')}">
              <ha-icon icon="hass:home-map-marker"></ha-icon>
              ${localize('common.return_to_base')}
            </paper-button>
          </div>
        `;
      }

      case 'returning': {
        return html`
          <div class="toolbar">
            <paper-button
              @click="${this.handleVacuumAction('resume', {
                defaultService: 'start',
                request: true,
              })}"
            >
              <ha-icon icon="hass:play"></ha-icon>
              ${localize('common.continue')}
            </paper-button>
            <paper-button @click="${this.handleVacuumAction('pause')}">
              <ha-icon icon="hass:pause"></ha-icon>
              ${localize('common.pause')}
            </paper-button>
          </div>
        `;
      }
      case 'docked':
      case 'idle':
      default: {
        const buttons = this.config.shortcuts.map(
          ({ name, service, icon, service_data, target }) => {
            const execute = () => {
              if (service) {
                return this.callService({ service, service_data, target });
              }
            };
            return html`
              <ha-icon-button label="${name}" @click="${execute}">
                <ha-icon icon="${icon}"></ha-icon>
              </ha-icon-button>
            `;
          },
        );

        const dockButton = html`
          <ha-icon-button
            label="${localize('common.return_to_base')}"
            @click="${this.handleVacuumAction('return_to_base')}"
            ><ha-icon icon="hass:home-map-marker"></ha-icon>
          </ha-icon-button>
        `;

        return html`
          <div class="toolbar">
            <ha-icon-button
              label="${localize('common.start')}"
              @click="${this.handleVacuumAction('start')}"
              ><ha-icon icon="hass:play"></ha-icon>
            </ha-icon-button>

            <ha-icon-button
              label="${localize('common.locate')}"
              @click="${this.handleVacuumAction('locate', { request: false })}"
              ><ha-icon icon="mdi:map-marker"></ha-icon>
            </ha-icon-button>

            ${state === 'idle' ? dockButton : ''}
            <div class="fill-gap"></div>
            ${buttons}
          </div>
        `;
      }
    }
  }

  private renderUnavailable(): Template {
    return html`
      <ha-card>
        <div class="preview not-available">
          <div class="metadata">
            <div class="not-available">
              ${localize('common.not_available')}
            </div>
          <div>
        </div>
      </ha-card>
    `;
  }

  protected render(): Template {
    if (!this.entity) {
      return this.renderUnavailable();
    }

    return html`
      <ha-card>
        <ha-ripple></ha-ripple>
        <div class="preview">
          <div class="header">
            <div class="tips">
              ${this.renderSource()} ${this.renderBattery()}
            </div>
            <div class="header-actions">
              ${this.renderSettingsToggle()}
              <ha-icon-button
                class="more-info"
                icon="mdi:dots-vertical"
                ?more-info="true"
                @click="${() => this.handleMore()}"
                ><ha-icon icon="mdi:dots-vertical"></ha-icon
              ></ha-icon-button>
            </div>
          </div>

          ${this.renderMapOrImage(this.entity.state)}

          <div class="metadata">
            ${this.renderName()} ${this.renderStatus()}
          </div>

          ${this.renderStats(this.entity.state)} ${this.renderSettingsPanel()}
        </div>

        ${this.renderToolbar(this.entity.state)}
      </ha-card>
    `;
  }
}

declare global {
  interface Window {
    customCards?: unknown[];
  }
}

window.customCards = window.customCards || [];
window.customCards.push({
  preview: true,
  type: 'yamilka-vacuum-card',
  name: 'Yamilka Vacuum Card',
  description: localize('common.description'),
});
