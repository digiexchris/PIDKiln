Feature: System Controls
  As a user managing the kiln controller
  I want access to system-level controls
  So that I can reboot the device and manage connections

  Background:
    Given the PIDKiln frontend is loaded in a browser
    And the WebSocket is connected

  @system @reboot
  Scenario: Reboot device with confirmation
    When I click the "Reboot" button
    Then a confirmation dialog should appear asking "Reboot the device?"
    When I confirm the reboot
    Then a reboot command should be sent to the server
    And the connection should be lost as the device restarts

  @system @reboot @cancel
  Scenario: Cancel reboot
    When I click the "Reboot" button
    And I cancel the confirmation dialog
    Then no reboot command should be sent
    And the device should continue operating normally

  @system @connect
  Scenario: Connect button when disconnected
    Given the WebSocket is disconnected
    Then the Connect button should be enabled
    When I click the Connect button
    Then a WebSocket connection should be established
    And the connection indicator should show "Connected"

  @system @connect @disabled
  Scenario: Connect button disabled when connected
    Given the WebSocket is connected
    Then the Connect button should be disabled

  @system @disconnect
  Scenario: Disconnect button when connected
    Given the WebSocket is connected
    Then the Disconnect button should be enabled
    When I click the Disconnect button
    Then the WebSocket connection should be closed
    And the connection indicator should show "Disconnected"
    And auto-reconnect should not be attempted

  @system @disconnect @disabled
  Scenario: Disconnect button disabled when disconnected
    Given the WebSocket is disconnected manually
    Then the Disconnect button should be disabled

