/*
Copyright © 2022 - 2023 SUSE LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import '~/support/commands';
import filterTests from '~/support/filterTests.js';
import { isRancherManagerVersion } from '../../support/utils';
import * as cypressLib from '@rancher-ecp-qa/cypress-library';
import { qase } from 'cypress-qase-reporter/dist/mocha';

Cypress.config();
describe('Machine inventory testing', () => {
  const elementalUser = "elemental-user"
  const hwLabels      = ["TotalCPUThread", "TotalMemory", "CPUModel",
                        "CPUVendor", "NumberBlockDevices", "NumberNetInterface",
                        "CPUVendorTotalCPUCores"]
  const k8sVersion    = Cypress.env('k8s_version');
  const clusterName   = "mycluster"
  const proxy         = "http://172.17.0.1:3128"
  const uiAccount     = Cypress.env('ui_account');
  const uiPassword    = "rancherpassword"

  beforeEach(() => {
    (uiAccount == "user") ? cy.login(elementalUser, uiPassword) : cy.login();
    cy.visit('/');

    // Open the navigation menu
    cypressLib.burgerMenuOpenIfClosed();

    // Click on the Elemental's icon
    cypressLib.accesMenu('OS Management');
  });

  filterTests(['main'], () => {
    qase(28,
      it('Check that machine inventory has been created', () => {
        cy.clickNavMenu(["Inventory of Machines"]);
        cy.contains('Namespace: fleet-default')
        cy.getBySel('sortable-cell-0-0')
          .contains('Active')
          .should('exist');
        cy.getBySel('sortable-cell-0-1')
          .contains('my-machine')
          .should('exist');
      })
    );

    qase(29,
      it('Check we can see our embedded hardware labels', () => {
        cy.clickNavMenu(["Inventory of Machines"]);
        cy.contains('my-machine')
          .click()
        cy.checkMachInvLabel('machine-registration', 'myInvLabel1', 'myInvLabelValue1', true);
        for (const key in hwLabels) {
          cy.clickNavMenu(["Inventory of Machines"]);
          // Because of the double .parent() call we have to keep this ugly chain
          // TODO: try to use something more elegant later!
          // eslint-disable-next-line cypress/unsafe-to-chain-command
          cy.get('.table-options-group > .btn > .icon')
            .click()
            .parent()
            .parent()
            .contains(hwLabels[key])
            .click({force: true})
          cy.contains(hwLabels[key]);
        }
      })
    );
  });
  
  filterTests(['main', 'upgrade'], () => {
    qase(30,
      it('Create Elemental cluster', () => {
        cy.getBySel('button-create-elemental-cluster')
          .click();
        cy.getBySel('name-ns-description-name')
          .type(clusterName);
        cy.getBySel('name-ns-description-description')
          .type('My Elemental testing cluster');
        cy.contains('Show deprecated Kubernetes')
          .click();
        cy.contains('Kubernetes Version')
          .click();
        cy.contains(k8sVersion)
          .click();
        // Configure proxy if proxy is set to elemental
        if ( Cypress.env('proxy') == "elemental") {
          cy.contains('Agent Environment Vars')
            .click();
          cy.get('#agentEnv > .key-value')
            .contains('Add')
            .click();
          cy.get('.key > input')
            .type('HTTP_PROXY');
          cy.get('.no-resize')
            .type(proxy);
          cy.get('#agentEnv > .key-value')
            .contains('Add')
            .click();
          cy.get(':nth-child(7) > input')
            .type('HTTPS_PROXY');
          if (isRancherManagerVersion('-head')) {
            cy.get(':nth-child(8) > > [data-testid="text-area-auto-grow"]').type(proxy);
          } else {
            cy.get(':nth-child(8) > .no-resize').type(proxy);
          }
          cy.get('#agentEnv > .key-value')
            .contains('Add')
            .click();
          cy.get(':nth-child(10) > input')
            .type('NO_PROXY');
          if (isRancherManagerVersion('-head')) {
            cy.get(':nth-child(11) > > [data-testid="text-area-auto-grow"]')
              .type('localhost,127.0.0.0/8,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.svc,.cluster.local');
          } else {
            cy.get(':nth-child(11) > .no-resize')
            .type('localhost,127.0.0.0/8,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.svc,.cluster.local');
          }
        }
        cy.clickButton('Create');
        // This wait can be replaced by something cleaner
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(3000);
        cypressLib.checkClusterStatus(clusterName, 'Updating', 300000);
        cypressLib.checkClusterStatus(clusterName, 'Active', 600000);
        // Ugly but needed unfortunately to make sure the cluster stops switching status
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(240000);
      })
    );
  });
  
  filterTests(['main', 'upgrade'], () => {
    it('Check Elemental cluster status', () => {
      cypressLib.checkClusterStatus(clusterName, 'Active', 600000);
      cypressLib.burgerMenuOpenIfClosed();
      cy.contains(clusterName)
        .click();
    })
  });
});
