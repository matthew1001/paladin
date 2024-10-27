// Copyright © 2024 Kaleido, Inc.
//
// SPDX-License-Identifier: Apache-2.0
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Config } from "@/config";
import { useRegQueries } from "@/queries/reg";
import { Box } from "@mui/material";
import { RegistryEntry } from "./RegistryEntry";

type Props = {
  registryName: string;
};

export const Registry: React.FC<Props> = ({ registryName }) => {
  const { useQueryEntries } = useRegQueries();

  const { data: registryEntries } = useQueryEntries(
    registryName,
    { limit: Config.REGISTRY_ENTRIES_QUERY_LIMIT },
    "any"
  );

  return (
    <Box>
      {registryEntries
        ?.filter((registryEntry) => registryEntry.name !== "root")
        .map((registryEntry) => (
          <RegistryEntry key={registryEntry.id} registryEntry={registryEntry} />
        ))}
    </Box>
  );
};
