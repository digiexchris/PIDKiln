Feature: WebSocket Connection Management
  As a user of the PIDKiln interface
  I want to see the connection status and control the connection
  So that I know when the kiln is reachable and can reconnect if needed

  Background:
    Given the PIDKiln frontend is loaded in a browser
    And the simulator backend is running

  @connection @status-bar
  Scenario: Initial connection on page load
    When the page finishes loading
    Then the connection indicator should show "Connected"
    And the status bar should display current temperatures
    And the Connect button should be disabled
    And the Disconnect button should be enabled

  @connection @disconnect
  Scenario: Manual disconnect
    Given the WebSocket is connected
    When I click the Disconnect button
    Then the connection indicator should show "Disconnected"
    And the status bar should show "N/A" for all temperatures
    And the status badge should show "OFFLINE"
    And the Connect button should be enabled
    And the Disconnect button should be disabled
    And the chart should display "CONNECTION LOST" overlay

  @connection @reconnect
  Scenario: Manual reconnect after disconnect
    Given the WebSocket is disconnected manually
    When I click the Connect button
    Then the connection indicator should show "Connected"
    And the status bar should display current temperatures
    And the chart should reload history data
    And the "CONNECTION LOST" overlay should be hidden

  @connection @auto-reconnect
  Scenario: Automatic reconnection after server disconnect
    Given the WebSocket is connected
    When the server closes the connection unexpectedly
    Then the connection indicator should show "Reconnecting..."
    And the status bar should show "N/A" for all temperatures
    And the chart should display "CONNECTION LOST" overlay
    And the Disconnect button should be enabled
    And the Connect button should be disabled

  @connection @auto-reconnect @timeout
  Scenario: Auto-reconnect timeout after 30 seconds
    Given the WebSocket is attempting to reconnect
    And the server remains unavailable
    When 30 seconds have elapsed
    Then the connection indicator should show "Disconnected"
    And the Connect button should be enabled
    And the Disconnect button should be disabled
    And the log should show "Reconnect timeout - giving up after 30s"

  @connection @auto-reconnect @success
  Scenario: Successful auto-reconnect
    Given the WebSocket is attempting to reconnect
    When the server becomes available
    Then the connection indicator should show "Connected"
    And the chart should reload history data from the server
    And the loaded program profile should be restored if one was loaded
    And the status bar should display current temperatures

  @connection @disconnect-during-reconnect
  Scenario: Cancel auto-reconnect by clicking Disconnect
    Given the WebSocket is attempting to reconnect
    When I click the Disconnect button
    Then the connection indicator should show "Disconnected"
    And auto-reconnect attempts should stop
    And the Connect button should be enabled

