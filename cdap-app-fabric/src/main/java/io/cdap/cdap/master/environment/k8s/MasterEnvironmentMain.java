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

package io.cdap.cdap.master.environment.k8s;

import io.cdap.cdap.common.conf.CConfiguration;
import io.cdap.cdap.common.conf.SConfiguration;
import io.cdap.cdap.common.logging.common.UncaughtExceptionHandler;
import io.cdap.cdap.common.options.OptionsParser;
import io.cdap.cdap.common.runtime.DaemonMain;
import io.cdap.cdap.common.utils.ProjectInfo;
import io.cdap.cdap.master.environment.MasterEnvironmentExtensionLoader;
import io.cdap.cdap.master.environment.MasterEnvironments;
import io.cdap.cdap.master.spi.environment.MasterEnvironment;
import io.cdap.cdap.master.spi.environment.MasterEnvironmentContext;
import io.cdap.cdap.master.spi.environment.MasterEnvironmentRunnable;
import org.apache.hadoop.conf.Configuration;
import org.slf4j.bridge.SLF4JBridgeHandler;

import java.io.File;

/**
 * A main class that initiate a {@link MasterEnvironment} and run a main class from the environment.
 */
public class MasterEnvironmentMain extends DaemonMain {

  private MasterEnvironmentRunnable runnable;
  private MasterEnvironmentContext context;
  private String[] args;

  public static void main(String[] args) throws Exception {
    // System wide setup
    Thread.setDefaultUncaughtExceptionHandler(new UncaughtExceptionHandler());

    // Intercept JUL loggers
    SLF4JBridgeHandler.removeHandlersForRootLogger();
    SLF4JBridgeHandler.install();

    new MasterEnvironmentMain().doMain(args);
  }

  @Override
  public void init(String[] args) throws Exception {
    EnvironmentOptions options = new EnvironmentOptions();
    this.args = OptionsParser.init(options, args, MasterEnvironmentMain.class.getSimpleName(),
                                   ProjectInfo.getVersion().toString(), System.out).toArray(new String[0]);

    String runnableClass = options.getRunnableClass();
    if (runnableClass == null) {
      throw new IllegalArgumentException("Missing runnable class name");
    }

    CConfiguration cConf = CConfiguration.create();
    SConfiguration sConf = SConfiguration.create();
    if (options.getExtraConfPath() != null) {
      cConf.addResource(new File(options.getExtraConfPath(), "cdap-site.xml").toURI().toURL());
      sConf.addResource(new File(options.getExtraConfPath(), "cdap-security.xml").toURI().toURL());
    }

    Configuration hConf = new Configuration();

    MasterEnvironmentExtensionLoader envExtLoader = new MasterEnvironmentExtensionLoader(cConf);
    MasterEnvironment masterEnv = envExtLoader.get(options.getEnvProvider());

    if (masterEnv == null) {
      throw new IllegalArgumentException("Unable to find a MasterEnvironment implementation with name "
                                           + options.getEnvProvider());
    }

    Class<?> cls = masterEnv.getClass().getClassLoader().loadClass(runnableClass);
    if (!MasterEnvironmentRunnable.class.isAssignableFrom(cls)) {
      throw new IllegalArgumentException("Runnable class " + runnableClass + " is not an instance of "
                                           + MasterEnvironmentRunnable.class);
    }
    runnable = (MasterEnvironmentRunnable) cls.newInstance();
    context = MasterEnvironments.createContext(cConf, hConf);
  }

  @Override
  public void start() throws Exception {
    runnable.run(context, args);
  }

  @Override
  public void stop() {
    runnable.stop();
  }

  @Override
  public void destroy() {
    // no-op
  }
}
