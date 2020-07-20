/*
 * Copyright © 2020 Cask Data, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

import * as React from 'react';
import { connect, Provider } from 'react-redux';
import SystemDelayStore from 'services/SystemDelayStore';
import SystemDelayActions from 'services/SystemDelayStore/SystemDelayActions';
import Snackbar from '@material-ui/core/Snackbar';
import Button from '@material-ui/core/Button';
import ee from 'event-emitter';
import { WINDOW_ON_FOCUS, WINDOW_ON_BLUR } from 'services/WindowManager';
import { getExperimentValue, isExperimentEnabled } from 'services/helpers';
import DataSource from 'services/datasource';
import flatten from 'lodash/flatten';

interface IBinding {
  resource: {
    id: string;
    requestTime: number;
  };
  type: string;
}

interface ISystemDelayProps {
  showDelay: boolean;
  activeDataSources: DataSource[];
}

interface ISystemDelayState {
  showDelay: boolean;
  delayedBindings: { [key: string]: number };
}

const EXPERIMENT_ID = 'system-delay-notification';
const HEALTH_CHECK_INTERVAL = 12000;
const DEFAULT_DELAY_TIME = 5000;

class SystemServicesDelayView extends React.Component<ISystemDelayProps> {
  public state: ISystemDelayState = {
    showDelay: false,
    delayedBindings: {},
  };
  private healthCheckInterval: NodeJS.Timeout;
  private eventEmitter = ee(ee);

  public componentDidMount() {
    if (isExperimentEnabled(EXPERIMENT_ID)) {
      this.checkForDelayedBindings();
    }
    this.startHealthCheck();
    this.eventEmitter.on(WINDOW_ON_FOCUS, () => {
      this.startHealthCheck();
    });
    this.eventEmitter.on(WINDOW_ON_BLUR, () => {
      this.stopHealthCheck();
    });
  }

  public componentWillUnmount() {
    this.stopHealthCheck();
  }

  private startHealthCheck = () => {
    if (isExperimentEnabled(EXPERIMENT_ID)) {
      this.healthCheckInterval = setInterval(this.checkForDelayedBindings, HEALTH_CHECK_INTERVAL);
    }
  };

  private checkForDelayedBindings = () => {
    const delayedTimeFromExperiment = getExperimentValue(EXPERIMENT_ID);
    const SERVICES_DELAYED_TIME = delayedTimeFromExperiment
      ? parseInt(delayedTimeFromExperiment, 10) * 1000
      : DEFAULT_DELAY_TIME;
    const activeBindings = flatten(
      this.props.activeDataSources.map((dataSource: DataSource) =>
        dataSource.getBindingsListForHealthCheck()
      )
    );
    const delayedBindings = { ...this.state.delayedBindings };
    const currentTime = Date.now();
    const isBindingDelayed = (binding: IBinding) => {
      const bindingStartTime = binding.resource.requestTime;
      return bindingStartTime && currentTime - bindingStartTime > SERVICES_DELAYED_TIME;
    };

    Object.values(activeBindings).forEach((currentBinding: IBinding) => {
      const { id } = currentBinding.resource;
      if (isBindingDelayed(currentBinding)) {
        // If binding is delayed, add it to list of delayed binding with
        // number of rechecks left - we will check these many times before
        // declaring that this binding is not delayed anymore
        delayedBindings[id] = 2;
      }
    });

    Object.keys(delayedBindings).forEach((id: string) => {
      // Previously delayed, wait for 3 intervals (tracked using this.state.delayedBindings)
      // before marking as healthy
      if (delayedBindings[id] < 1) {
        delete delayedBindings[id];
      } else {
        delayedBindings[id] -= 1;
      }
    });
    this.setState({ delayedBindings }, () => {
      if (Object.keys(delayedBindings).length > 0) {
        SystemDelayStore.dispatch({
          type: SystemDelayActions.showDelay,
        });
      } else {
        SystemDelayStore.dispatch({
          type: SystemDelayActions.hideDelay,
        });
      }
    });
  };

  private stopHealthCheck = () => {
    this.setState({ delayedBindings: {} }, () => {
      SystemDelayStore.dispatch({
        type: SystemDelayActions.hideDelay,
      });
    });
    clearInterval(this.healthCheckInterval);
  };

  private doNotShowAgain = () => {
    this.stopHealthCheck();
    window.localStorage.removeItem(`${EXPERIMENT_ID}-value`);
    window.localStorage.setItem(EXPERIMENT_ID, 'false');
  };

  public render() {
    return (
      <Snackbar
        data-cy="system-delay-snackbar"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        open={this.props.showDelay}
        message="Some system services are experiencing delays."
        action={
          <Button
            size="small"
            color="primary"
            onClick={this.doNotShowAgain}
            data-cy="do-not-show-delay-btn"
          >
            Do not show again
          </Button>
        }
      />
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeDataSources: state.activeDataSources,
    showDelay: state.showDelay,
  };
};

const ConnectedSystemServicesDelay = connect(mapStateToProps)(SystemServicesDelayView);
export default function SystemServicesDelay({ ...props }) {
  return (
    <Provider store={SystemDelayStore}>
      <ConnectedSystemServicesDelay {...props} />
    </Provider>
  );
}
