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

package io.cdap.cdap.master.environment;

import com.google.inject.AbstractModule;
import com.google.inject.Guice;
import com.google.inject.Injector;
import io.cdap.cdap.common.conf.CConfiguration;
import io.cdap.cdap.common.guice.ConfigModule;
import io.cdap.cdap.common.guice.DFSLocationModule;
import io.cdap.cdap.master.spi.environment.MasterEnvironment;
import io.cdap.cdap.master.spi.environment.MasterEnvironmentContext;
import org.apache.hadoop.conf.Configuration;

/**
 * Utility class for {@link MasterEnvironment} operations.
 */
public final class MasterEnvironments {

  /**
   * Creates a new {@link MasterEnvironmentContext} from the given configurations.
   */
  public static MasterEnvironmentContext createContext(CConfiguration cConf, Configuration hConf) {
    Injector injector = Guice.createInjector(
      new ConfigModule(cConf, hConf),
      new DFSLocationModule(),
      new AbstractModule() {
        @Override
        protected void configure() {
          bind(MasterEnvironmentContext.class).to(DefaultMasterEnvironmentContext.class);
        }
      });
    return injector.getInstance(MasterEnvironmentContext.class);
  }

  private MasterEnvironments() {
    // private for util class.
  }
}
