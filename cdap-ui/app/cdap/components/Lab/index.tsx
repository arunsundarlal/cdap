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
import withStyles, { WithStyles, StyleRules } from '@material-ui/core/styles/withStyles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Switch from '@material-ui/core/Switch';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import { Typography, TextField } from '@material-ui/core';
import NewReleasesRoundedIcon from '@material-ui/icons/NewReleasesRounded';
import experimentsList from './experiment-list';
import If from 'components/If';
import { getExperimentValue } from 'services/helpers';

const styles = (): StyleRules => {
  return {
    root: {
      display: 'flex',
      justifyContent: 'center',
      paddingTop: '5%',
    },
    paperContainer: {
      display: 'flex',
    },
    experimentsTable: {
      maxWidth: 900,
    },
    screenshot: {
      maxWidth: 256,
    },
    defaultExperimentIcon: {
      display: 'block',
      fontSize: 64,
      margin: '0 auto',
    },
    switchCell: {
      width: 145,
    },
  };
};

interface ILabProps extends WithStyles<typeof styles> {}
interface IExperiment {
  id: string;
  enabled: boolean;
  screenshot: string | null;
  name: string;
  description: string;
  showValue?: boolean;
  valueLabel?: string;
  valueType?: string;
}
interface ILabState {
  experiments: IExperiment[];
}

class Lab extends React.Component<ILabProps, ILabState> {
  public componentDidMount() {
    experimentsList.forEach((experiment: IExperiment) => {
      // If experiment preference is present in storage, use it.
      // If not, use the default value and set it in storage and use it.
      const experimentStatusFromStorage = window.localStorage.getItem(experiment.id);
      if (experimentStatusFromStorage === null) {
        window.localStorage.setItem(experiment.id, experiment.enabled.toString());
      } else {
        experiment.enabled = experimentStatusFromStorage === 'true' ? true : false;
      }
    });
    this.setState({ experiments: experimentsList });
  }

  public updatePreference = (event: React.ChangeEvent<HTMLInputElement>) => {
    const experiments = this.state.experiments.map((experiment: IExperiment) => {
      if (experiment.id === event.target.name) {
        experiment.enabled = !experiment.enabled;
        window.localStorage.setItem(event.target.name, experiment.enabled.toString());
      }
      return experiment;
    });
    this.setState({ experiments });
  };

  public updateExperimentValue = (event: React.ChangeEvent<HTMLInputElement>) => {
    window.localStorage.setItem(event.target.name, event.target.value);
  };

  public render() {
    const { classes } = this.props;

    return (
      <div className={classes.root}>
        <Paper className={classes.paperContainer}>
          <Table className={classes.experimentsTable}>
            <TableHead>
              <TableRow>
                <TableCell>
                  <Typography variant="h5">Image</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="h5">Experiment</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="h5">Status</Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {this.state &&
                this.state.experiments.map((experiment: IExperiment) => (
                  <TableRow key={experiment.id}>
                    <TableCell>
                      {experiment.screenshot ? (
                        <img className={classes.screenshot} src={experiment.screenshot} />
                      ) : (
                        <NewReleasesRoundedIcon className={classes.defaultExperimentIcon} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="h5">{experiment.name}</Typography>
                      <br />
                      <Typography variant="body1">{experiment.description}</Typography>
                      <br />
                      <Typography variant="caption">ID: {experiment.id}</Typography>
                      <br />
                      <If condition={experiment.showValue}>
                        <TextField
                          data-cy={`${experiment.id}-field`}
                          variant="outlined"
                          margin="dense"
                          label={experiment.valueLabel || 'Experiment value'}
                          type={experiment.valueType}
                          onChange={this.updateExperimentValue}
                          name={`${experiment.id}-value`}
                          defaultValue={getExperimentValue(experiment.id)}
                        ></TextField>
                      </If>
                    </TableCell>
                    <TableCell className={classes.switchCell}>
                      <FormControlLabel
                        label={experiment.enabled ? 'Enabled' : 'Disabled'}
                        control={
                          <Switch
                            data-cy={`${experiment.id}-switch`}
                            name={experiment.id}
                            color="primary"
                            onChange={this.updatePreference}
                            checked={experiment.enabled}
                            value={experiment.enabled}
                          />
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Paper>
      </div>
    );
  }
}

const StyledLab = withStyles(styles)(Lab);
export default StyledLab;
