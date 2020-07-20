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

package io.cdap.cdap.k8s.runtime;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import io.cdap.cdap.master.spi.environment.MasterEnvironmentContext;
import io.cdap.cdap.master.spi.environment.MasterEnvironmentRunnable;
import org.apache.twill.api.LocalFile;
import org.apache.twill.filesystem.Location;
import org.apache.twill.internal.DefaultLocalFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 *
 */
public class FileLocalizerMasterEnvironmentRunnable implements MasterEnvironmentRunnable {

  @Override
  public void run(MasterEnvironmentContext context, String[] args) throws Exception {
    if (args.length < 2) {
      // This should never happen
      throw new IllegalArgumentException("Expected to have two arguments: localization json file, and target dir");
    }
    try (BufferedReader reader = Files.newBufferedReader(Paths.get(args[0]), StandardCharsets.UTF_8)) {
      List<DefaultLocalFile> files = new Gson().fromJson(reader, new TypeToken<List<DefaultLocalFile>>() { }.getType());
      Path targetDir = Paths.get(args[1]);
      Files.createDirectories(targetDir);

      for (LocalFile localFile : files) {
        Location location = context.getLocationFactory().create(localFile.getURI());
        Path targetPath = targetDir.resolve(localFile.getName());

        if (localFile.isArchive()) {
          expand(location, targetPath);
        } else {
          copy(location, targetPath);
        }
      }
    }
  }

  private void copy(Location location, Path target) throws IOException {
    try (InputStream is = location.getInputStream()) {
      Files.copy(is, target);
    }
  }

  private void expand(Location location, Path targetDir) throws IOException {
    try (ZipInputStream is = new ZipInputStream(location.getInputStream())) {
      Path targetPath = Files.createDirectories(targetDir);
      ZipEntry entry;
      while ((entry = is.getNextEntry()) != null) {
        Path outputPath = targetPath.resolve(entry.getName());

        if (entry.isDirectory()) {
          Files.createDirectories(outputPath);
        } else {
          Files.createDirectories(outputPath.getParent());
          Files.copy(is, outputPath);
        }
      }
    }
  }
}
